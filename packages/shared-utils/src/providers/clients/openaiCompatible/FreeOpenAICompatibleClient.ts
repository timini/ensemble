import { ProviderError, classifyProviderError } from '../../errors/providerError';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { ProviderName, ProviderRouting, StructuredResponse, TokenUsage, ValidationResult } from '../../types';
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
  /** The upstream host's own finish reason (OpenRouter). */
  native_finish_reason?: string | null;
  error?: InBandError | null;
}

/** Fields OpenRouter adds to a response body or stream chunk that say who served it. */
interface ServedBy {
  id?: unknown;
  /** The host that served the request (OpenRouter), such as "Anthropic" or "Amazon Bedrock". */
  provider?: unknown;
  model?: unknown;
}

interface ChatMessageFields {
  content?: unknown;
  /** Reasoning text (OpenRouter `reasoning`, DeepSeek and vLLM `reasoning_content`). */
  reasoning?: unknown;
  reasoning_content?: unknown;
}

interface ChatChunk extends ServedBy {
  choices?: (ChatChoiceBase & { delta?: ChatMessageFields })[];
  usage?: ChatCompletionUsage | null;
  error?: InBandError | null;
}

interface ChatCompletion extends ServedBy {
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

/** What a response said about itself, for the message of an empty reply. */
export interface EmptyResponseDetails {
  finishReason?: string | null;
  nativeFinishReason?: string | null;
  reasoningOnly?: boolean;
  /** The host that served it (OpenRouter `provider`). */
  servedBy?: string;
  responseId?: string;
  completionTokens?: number;
}

/**
 * A completion with no answer text. Usually a failed upstream call that was
 * not reported as an error. The finish reasons, the host that served it, the
 * response id, the completion tokens and whether reasoning came back are in
 * the message, so the cause can be read from the logs and the results file.
 */
export function emptyResponseError(
  provider: ProviderName,
  model: string,
  details: EmptyResponseDetails,
): ProviderError {
  const parts = [`finish_reason: ${details.finishReason ?? 'none'}`];
  if (details.nativeFinishReason) parts.push(`native_finish_reason: ${details.nativeFinishReason}`);
  if (details.servedBy) parts.push(`served by: ${details.servedBy}`);
  if (details.responseId) parts.push(`id: ${details.responseId}`);
  if (details.completionTokens !== undefined) parts.push(`completion_tokens: ${details.completionTokens}`);
  if (details.reasoningOnly) parts.push('reasoning came back but no answer content');
  return new ProviderError(`Empty response from ${model} (${parts.join('; ')}).`, 'other', { provider });
}

/** Collects what a body or stream chunk says about the host that served it. */
function noteServedBy(target: EmptyResponseDetails, body: ServedBy & { usage?: ChatCompletionUsage | null }): void {
  if (typeof body.provider === 'string' && body.provider) target.servedBy = body.provider;
  if (typeof body.id === 'string' && body.id) target.responseId = body.id;
  const completion = body.usage?.completion_tokens;
  if (typeof completion === 'number') target.completionTokens = completion;
}

function isOpenRouter(baseURL: string): boolean {
  try {
    return new URL(baseURL).hostname.endsWith('openrouter.ai');
  } catch {
    return false;
  }
}

/**
 * OpenRouter's `provider` object. Structured calls ask for hosts that honour
 * every parameter sent (require_parameters) unless routing turns that off;
 * routing.provider adds host preferences such as order or ignore.
 */
export function routingFields(
  baseURL: string,
  hasResponseFormat: boolean,
  routing?: ProviderRouting,
): Record<string, unknown> {
  if (!isOpenRouter(baseURL)) return {};
  const provider: Record<string, unknown> = {
    ...(hasResponseFormat && routing?.requireParameters !== false ? { require_parameters: true } : {}),
    ...(routing?.provider ?? {}),
  };
  return Object.keys(provider).length > 0 ? { provider } : {};
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
            ...routingFields(this.options.getBaseURL(), Boolean(responseFormat), options.options?.routing),
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
        const details: EmptyResponseDetails = {
          finishReason: choice?.finish_reason,
          nativeFinishReason: choice?.native_finish_reason,
          reasoningOnly: hasReasoning(choice?.message),
        };
        noteServedBy(details, completion);
        lastError = emptyResponseError(this.provider, options.model, details);
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

    // An empty last format is reported as an empty reply (a ProviderError,
    // passed through as it is), so the caller can fall back or retry.
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
          ...routingFields(this.options.getBaseURL(), false, options.streamOptions?.routing),
        },
        signal: options.signal,
      });

      const details: EmptyResponseDetails = {};
      for await (const chunk of readServerSentEvents<ChatChunk>(response)) {
        const inBand = inBandErrorOf(chunk, this.provider);
        if (inBand) throw inBand;
        noteServedBy(details, chunk);
        if (chunk.usage?.total_tokens) tokenCount = chunk.usage.total_tokens;
        usage = fromChatCompletionUsage(chunk.usage) ?? usage;
        const choice = chunk.choices?.[0];
        if (choice?.finish_reason) details.finishReason = choice.finish_reason;
        if (choice?.native_finish_reason) details.nativeFinishReason = choice.native_finish_reason;
        if (hasReasoning(choice?.delta)) details.reasoningOnly = true;
        const content = contentText(choice?.delta?.content);
        if (content.length > 0) {
          fullResponse += content;
          options.onChunk(content);
        }
      }

      if (!fullResponse.trim()) {
        throw emptyResponseError(this.provider, options.model, details);
      }
      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined, usage);
    } catch (error) {
      options.onError(classifyProviderError(error, { provider: this.provider, label: 'OpenAI-compatible API error' }));
    }
  }
}
