import { classifyProviderError } from '../../errors/providerError';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type {
  GenerateEmbeddingsOptions,
  ProviderName,
  StructuredResponse,
  TokenUsage,
  ValidationResult,
} from '../../types';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import { fromChatCompletionUsage, type ChatCompletionUsage } from '../../utils/usage';
import { requestOpenAICompatibleEmbedding } from '../../embeddings/openAICompatibleEmbeddings';
import { EmbeddingsNotSupportedError } from '../../embeddings/errors';
import {
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

interface ChatChunk {
  choices?: { delta?: { content?: unknown } }[];
  usage?: ChatCompletionUsage | null;
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null } }[];
  usage?: ChatCompletionUsage | null;
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

  protected override async embedWithProvider(
    apiKey: string,
    text: string,
    options?: GenerateEmbeddingsOptions,
  ): Promise<number[]> {
    const model = this.options.getEmbeddingModel?.()?.trim();
    if (!model) throw new EmbeddingsNotSupportedError(this.provider);
    return requestOpenAICompatibleEmbedding({
      baseURL: this.options.getBaseURL(),
      apiKey,
      model,
      input: text,
      fetchImpl: this.options.fetchImpl,
      signal: options?.signal,
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
            ...(options.options?.temperature !== undefined && { temperature: options.options.temperature }),
            ...(options.options?.maxTokens !== undefined && { max_tokens: options.options.maxTokens }),
          },
          signal: options.options?.signal,
        });
        completion = (await response.json()) as ChatCompletion;
      } catch (error) {
        if (!isUnsupportedFormatError(error)) {
          throw classifyProviderError(error, { provider: this.provider, label: 'OpenAI-compatible API error' });
        }
        lastError = error;
        continue;
      }

      const raw = completion.choices?.[0]?.message?.content ?? '';
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
          ...(options.streamOptions?.maxTokens !== undefined && { max_tokens: options.streamOptions.maxTokens }),
        },
        signal: options.streamOptions?.signal,
      });

      for await (const chunk of readServerSentEvents<ChatChunk>(response)) {
        if (chunk.usage?.total_tokens) tokenCount = chunk.usage.total_tokens;
        usage = fromChatCompletionUsage(chunk.usage) ?? usage;
        const content = chunk.choices?.[0]?.delta?.content;
        if (typeof content === 'string' && content.length > 0) {
          fullResponse += content;
          options.onChunk(content);
        }
      }

      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined, usage);
    } catch (error) {
      options.onError(classifyProviderError(error, { provider: this.provider, label: 'OpenAI-compatible API error' }));
    }
  }
}
