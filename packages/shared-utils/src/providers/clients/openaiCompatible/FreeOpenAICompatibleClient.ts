import { ProviderError, classifyProviderError, isProviderError } from '../../errors/providerError';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { ProviderName, StructuredResponse, TokenUsage, ValidationResult } from '../../types';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import { fromChatCompletionUsage, type ChatCompletionUsage } from '../../utils/usage';
import { requestOpenAICompatibleEmbedding } from '../../embeddings/openAICompatibleEmbeddings';
import { EmbeddingsNotSupportedError } from '../../embeddings/errors';
import {
  OpenAICompatibleHttpError,
  openAICompatibleRequest,
  readServerSentEvents,
  type OpenAICompatibleConnection,
} from './openAICompatibleHttp';
import {
  STRUCTURED_FORMATS,
  extractJson,
  isUnsupportedFormatError,
  responseFormatFor,
  structuredPrompt,
} from './structuredOutput';

export interface OpenAICompatibleClientOptions {
  /** API root ending in `/v1`, read at call time so edits apply at once. */
  getBaseURL: () => string;
  /** Embedding model on this server, if any. Without one, embeddings are not supported. */
  getEmbeddingModel?: () => string | undefined;
  /** Injected fetch, for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * An error a server reports inside a 200 response. OpenRouter does this when
 * the upstream provider fails after the request was accepted: a top-level
 * `error`, an `error` on the choice, or `finish_reason: "error"`.
 */
interface InBandError {
  code?: unknown;
  message?: unknown;
  metadata?: unknown;
}

interface ChatChoiceBase {
  finish_reason?: string | null;
  error?: InBandError | null;
}

interface ChatMessageFields {
  content?: unknown;
  /** Reasoning text (OpenRouter `reasoning`, DeepSeek and vLLM `reasoning_content`). */
  reasoning?: unknown;
  reasoning_content?: unknown;
}

interface ChatChunk {
  choices?: (ChatChoiceBase & { delta?: ChatMessageFields })[];
  usage?: ChatCompletionUsage | null;
  error?: InBandError | null;
}

interface ChatCompletion {
  choices?: (ChatChoiceBase & { message?: ChatMessageFields })[];
  usage?: ChatCompletionUsage | null;
  error?: InBandError | null;
}

/**
 * Text of a message `content`: a string, or an array of content parts whose
 * text parts are joined. Anything else is empty.
 */
export function contentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      const text = (part as { text?: unknown } | null)?.text;
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

function hasReasoning(fields: ChatMessageFields | undefined): boolean {
  return contentText(fields?.reasoning).trim().length > 0 || contentText(fields?.reasoning_content).trim().length > 0;
}

/** The error a 200 body or stream chunk carries, if any, as an error to throw. */
export function inBandErrorOf(
  body: Pick<ChatCompletion, 'error'> & { choices?: ChatChoiceBase[] },
  provider: ProviderName,
): ProviderError | undefined {
  const choice = body.choices?.[0];
  const error = body.error ?? choice?.error ?? undefined;
  if (!error && choice?.finish_reason !== 'error') return undefined;
  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : 'The provider reported an error (finish_reason: error).';
  const code = typeof error?.code === 'number' ? error.code : Number.parseInt(String(error?.code ?? ''), 10);
  if (Number.isInteger(code) && code >= 400 && code <= 599) {
    return classifyProviderError(new OpenAICompatibleHttpError(`${code} ${message}`, code, new Headers()), {
      provider,
      label: 'OpenAI-compatible API error',
    });
  }
  // No usable status: an upstream failure after the request was accepted.
  return new ProviderError(`OpenAI-compatible API error: ${message}`, 'provider_unavailable', { provider });
}

/**
 * A completion with no answer text. Usually a failed upstream call that was
 * not reported as an error. The finish reason and whether reasoning came
 * back are in the message, so the cause can be read from the logs.
 */
export function emptyResponseError(
  provider: ProviderName,
  model: string,
  finishReason: string | null | undefined,
  reasoningOnly: boolean,
): ProviderError {
  const details = [`finish_reason: ${finishReason ?? 'none'}`];
  if (reasoningOnly) details.push('reasoning came back but no answer content');
  return new ProviderError(`Empty response from ${model} (${details.join('; ')}).`, 'other', { provider });
}

/** OpenRouter routes a model to several hosts; this keeps it on hosts that honour every parameter sent. */
function routingFields(baseURL: string, hasResponseFormat: boolean): Record<string, unknown> {
  if (!hasResponseFormat) return {};
  try {
    return new URL(baseURL).hostname.endsWith('openrouter.ai') ? { provider: { require_parameters: true } } : {};
  } catch {
    return {};
  }
}

/**
 * Free mode client for one OpenAI-compatible server: Ollama, LM Studio,
 * llama.cpp server, vLLM, OpenRouter, Groq, Together or any custom URL.
 *
 * Uses fetch rather than the OpenAI SDK so that no Authorization header (and
 * none of the SDK's extra headers, which local servers' CORS rules may
 * reject) is sent when the key is empty. The key is optional.
 *
 * Structured output tries `json_schema`, then `json_object`, then plain
 * prompting with the schema in the prompt, and parses the JSON out of the
 * text (see structuredOutput.ts). Errors go through classifyProviderError.
 */
export class FreeOpenAICompatibleClient extends BaseFreeClient {
  protected override readonly requiresApiKey = false;

  constructor(
    provider: ProviderName,
    getApiKey: () => string | null,
    private readonly options: OpenAICompatibleClientOptions,
  ) {
    super(provider, getApiKey);
  }

  /** Embeddings go to `POST /embeddings`; without an embedding model they throw EmbeddingsNotSupportedError. */
  override readonly supportsEmbeddings: boolean = true;

  /** True when an embedding model is set for this server. */
  hasEmbeddingModel(): boolean {
    return Boolean(this.options.getEmbeddingModel?.()?.trim());
  }

  private connection(apiKey: string): OpenAICompatibleConnection {
    return { baseURL: this.options.getBaseURL(), apiKey, fetchImpl: this.options.fetchImpl };
  }

  /** Every model id the server lists, unfiltered. Throws on failure. */
  async listModels(apiKey = this.resolveApiKey() ?? ''): Promise<string[]> {
    const response = await openAICompatibleRequest(this.connection(apiKey), '/models', { method: 'GET' });
    const body = (await response.json()) as { data?: { id?: unknown }[] };
    return (body.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!this.options.getBaseURL().trim()) {
      return { valid: false, error: 'Base URL is required.' };
    }
    try {
      await this.listModels(apiKey ?? '');
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: sanitizeProviderErrorMessage(
          error instanceof Error ? error.message : String(error),
          'Could not reach the endpoint.',
        ),
      };
    }
  }

  /** The server's list, or an empty list when it cannot be read. Never mock models. */
  override async listAvailableTextModels(): Promise<string[]> {
    try {
      return await this.listModels();
    } catch {
      return [];
    }
  }

  protected override async embedWithProvider(apiKey: string, text: string): Promise<number[]> {
    const model = this.options.getEmbeddingModel?.()?.trim();
    if (!model) throw new EmbeddingsNotSupportedError(this.provider);
    return requestOpenAICompatibleEmbedding({
      baseURL: this.options.getBaseURL(),
      apiKey,
      model,
      input: text,
      fetchImpl: this.options.fetchImpl,
    });
  }

  protected override async generateStructuredWithProvider<T>(
    options: StructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();
    let lastError: unknown;

    let emptyFormats = 0;

    for (const format of STRUCTURED_FORMATS) {
      let completion: ChatCompletion;
      try {
        const responseFormat = responseFormatFor(format, options.schema);
        const response = await openAICompatibleRequest(this.connection(options.apiKey), '/chat/completions', {
          method: 'POST',
          body: {
            model: options.model,
            messages: [{ role: 'user', content: structuredPrompt(format, options.prompt, options.schema) }],
            ...(responseFormat ? { response_format: responseFormat } : {}),
            ...routingFields(this.options.getBaseURL(), Boolean(responseFormat)),
            ...(options.options?.temperature !== undefined && { temperature: options.options.temperature }),
          },
          signal: options.signal,
        });
        completion = (await response.json()) as ChatCompletion;
      } catch (error) {
        if (!isUnsupportedFormatError(error)) {
          throw classifyProviderError(error, { provider: this.provider, label: 'OpenAI-compatible API error' });
        }
        lastError = error;
        continue;
      }

      // An upstream failure is not a format problem: report it so the caller can retry.
      const inBand = inBandErrorOf(completion, this.provider);
      if (inBand) throw inBand;

      const choice = completion.choices?.[0];
      const raw = contentText(choice?.message?.content);
      if (!raw.trim()) {
        emptyFormats += 1;
        lastError = emptyResponseError(this.provider, options.model, choice?.finish_reason, hasReasoning(choice?.message));
        continue;
      }
      try {
        const parsed = extractJson<T>(raw);
        const usage = fromChatCompletionUsage(completion.usage);
        const tokenCount = completion.usage?.total_tokens;
        return {
          parsed,
          raw,
          responseTimeMs: Date.now() - startTime,
          ...(tokenCount ? { tokenCount } : {}),
          ...(usage ? { usage } : {}),
        };
      } catch (error) {
        // The server accepted the format but did not follow it; try the next one.
        lastError = error;
      }
    }

    if (emptyFormats === STRUCTURED_FORMATS.length && isProviderError(lastError)) throw lastError;
    throw classifyProviderError(lastError ?? new Error('No structured output.'), {
      provider: this.provider,
      label: 'OpenAI-compatible structured output failed',
    });
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;
    let usage: TokenUsage | undefined;

    try {
      const response = await openAICompatibleRequest(this.connection(options.apiKey), '/chat/completions', {
        method: 'POST',
        body: {
          model: options.model,
          stream: true,
          stream_options: { include_usage: true },
          messages: [{ role: 'user', content: options.prompt }],
          ...(options.streamOptions?.temperature !== undefined && { temperature: options.streamOptions.temperature }),
          ...(options.streamOptions?.seed !== undefined && { seed: options.streamOptions.seed }),
        },
        signal: options.signal,
      });

      let finishReason: string | null | undefined;
      let sawReasoning = false;
      for await (const chunk of readServerSentEvents<ChatChunk>(response)) {
        const inBand = inBandErrorOf(chunk, this.provider);
        if (inBand) throw inBand;
        if (chunk.usage?.total_tokens) tokenCount = chunk.usage.total_tokens;
        usage = fromChatCompletionUsage(chunk.usage) ?? usage;
        const choice = chunk.choices?.[0];
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        if (hasReasoning(choice?.delta)) sawReasoning = true;
        const content = contentText(choice?.delta?.content);
        if (content.length > 0) {
          fullResponse += content;
          options.onChunk(content);
        }
      }

      if (!fullResponse.trim()) {
        throw emptyResponseError(this.provider, options.model, finishReason, sawReasoning);
      }
      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined, usage);
    } catch (error) {
      options.onError(classifyProviderError(error, { provider: this.provider, label: 'OpenAI-compatible API error' }));
    }
  }
}
