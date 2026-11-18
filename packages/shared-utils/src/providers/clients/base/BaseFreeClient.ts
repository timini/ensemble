import type {
  AIProvider,
  GenerateEmbeddingsOptions,
  GenerateStructuredOptions,
  JsonSchema,
  ProviderName,
  StreamResponseOptions,
  StructuredResponse,
  TokenUsage,
  ValidationResult,
} from '../../types';
import { MockProviderClient } from '../mock/MockProviderClient';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import { ProviderError, cancelledError, classifyProviderError } from '../../errors/providerError';
import { EmbeddingsNotSupportedError } from '../../embeddings/errors';

/** Default client-side limit for one streamed answer (2 minutes). */
export const DEFAULT_STREAM_TIMEOUT_MS = 120000;

export interface StreamHandlers {
  onChunk: (chunk: string) => void;
  onComplete: (
    fullResponse: string,
    responseTime: number,
    tokenCount?: number,
    usage?: TokenUsage,
  ) => void;
  onError: (error: Error) => void;
}

export interface StreamOptions extends StreamHandlers {
  apiKey: string;
  prompt: string;
  model: string;
  streamOptions?: StreamResponseOptions;
}

export interface StructuredOptions {
  apiKey: string;
  prompt: string;
  model: string;
  schema: JsonSchema;
  options?: GenerateStructuredOptions;
}

/**
 * Base class for Free mode provider clients.
 *
 * Handles API key presence checks, timeouts and error classification:
 * every error passed to onError is a ProviderError with a kind. The mock client is only used
 * for the static model metadata and the fallback text model list; embeddings
 * never fall back to fake vectors. A provider without an embeddings API
 * throws EmbeddingsNotSupportedError.
 */
export abstract class BaseFreeClient implements AIProvider {
  protected readonly mockClient: MockProviderClient;

  constructor(
    protected readonly provider: ProviderName,
    private readonly getApiKey: () => string | null,
  ) {
    this.mockClient = new MockProviderClient({ providerFilter: provider });
  }

  /**
   * False for servers that work without a key (local OpenAI-compatible
   * servers). Calls then go out with an empty key instead of failing with
   * `missing_key`.
   */
  protected readonly requiresApiKey: boolean = true;

  protected resolveApiKey(): string | null {
    const key = this.getApiKey();
    if (!key && !this.requiresApiKey) return '';
    return key;
  }

  /** Default timeout for streaming operations (2 minutes) */
  protected static readonly STREAM_TIMEOUT_MS = DEFAULT_STREAM_TIMEOUT_MS;

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (
      fullResponse: string,
      responseTime: number,
      tokenCount?: number,
      usage?: TokenUsage,
    ) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    const signal = options?.signal;
    if (signal?.aborted) {
      onError(cancelledError(this.provider));
      return;
    }

    const apiKey = this.resolveApiKey();

    if (apiKey === null || (this.requiresApiKey && !apiKey)) {
      onError(
        new ProviderError(
          `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
          'missing_key',
          { provider: this.provider },
        ),
      );
      return;
    }

    // Once the stream has finished, failed or timed out, later callbacks from
    // a stream that is still running in the background are dropped.
    let settled = false;
    const report = (error: unknown) => {
      if (settled) return;
      settled = true;
      onError(classifyProviderError(error, { provider: this.provider }));
    };

    const timeoutMs = options?.timeoutMs ?? BaseFreeClient.STREAM_TIMEOUT_MS;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let onAbort: (() => void) | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      // A cancel ends the call at once, even for SDK clients that cannot abort
      // their request; fetch based clients also abort it through the signal.
      onAbort = () => reject(cancelledError(this.provider));
      signal?.addEventListener('abort', onAbort, { once: true });
      timeoutId = setTimeout(() => {
        reject(
          new ProviderError(
            `Streaming timeout for ${this.provider} after ${Math.round(timeoutMs / 1000)}s. The API may be unresponsive.`,
            'timeout',
            { provider: this.provider },
          ),
        );
      }, timeoutMs);
    });

    try {
      await Promise.race([
        this.streamWithProvider({
          apiKey,
          prompt,
          model,
          onChunk: (chunk) => {
            if (!settled) onChunk(chunk);
          },
          onComplete: (...args) => {
            if (settled) return;
            settled = true;
            onComplete(...args);
          },
          onError: report,
          streamOptions: options,
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      report(error);
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      if (onAbort) signal?.removeEventListener('abort', onAbort);
    }
  }

  /** True when this client implements embedWithProvider. */
  readonly supportsEmbeddings: boolean = false;

  async generateEmbeddings(text: string, options?: GenerateEmbeddingsOptions): Promise<number[]> {
    if (options?.signal?.aborted) throw cancelledError(this.provider);
    if (!this.supportsEmbeddings) {
      throw new EmbeddingsNotSupportedError(this.provider);
    }

    const apiKey = this.resolveApiKey();

    if (apiKey === null || (this.requiresApiKey && !apiKey)) {
      throw new Error(
        `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
      );
    }

    return this.embedWithProvider(apiKey, text, options);
  }

  /** Provider-specific embeddings call. Override together with supportsEmbeddings. */
  protected async embedWithProvider(
    _apiKey: string,
    _text: string,
    _options?: GenerateEmbeddingsOptions,
  ): Promise<number[]> {
    throw new EmbeddingsNotSupportedError(this.provider);
  }

  listAvailableModels() {
    return this.mockClient.listAvailableModels();
  }

  async listAvailableTextModels(): Promise<string[]> {
    const apiKey = this.resolveApiKey();
    if (apiKey === null || (this.requiresApiKey && !apiKey)) {
      return this.mockClient.listAvailableTextModels();
    }

    try {
      return await this.fetchTextModels(apiKey);
    } catch (error) {
      const safeError = sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
      console.warn(
        `Falling back to default text models for ${this.provider}: ${safeError}`,
      );
      return this.mockClient.listAvailableTextModels();
    }
  }

  protected async fetchTextModels(_apiKey: string): Promise<string[]> {
    return this.mockClient.listAvailableTextModels();
  }

  async generateStructured<T>(
    prompt: string,
    model: string,
    schema: JsonSchema,
    options?: GenerateStructuredOptions,
  ): Promise<StructuredResponse<T>> {
    if (options?.signal?.aborted) throw cancelledError(this.provider);
    const apiKey = this.resolveApiKey();

    if (apiKey === null || (this.requiresApiKey && !apiKey)) {
      throw new Error(
        `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
      );
    }

    return this.generateStructuredWithProvider<T>({
      apiKey,
      prompt,
      model,
      schema,
      options,
    });
  }

  protected async generateStructuredWithProvider<T>(
    _options: StructuredOptions,
  ): Promise<StructuredResponse<T>> {
    throw new Error(
      `${this.provider} structured output is not yet implemented for Free mode.`,
    );
  }

  protected async streamWithProvider(_options: StreamOptions): Promise<void> {
    throw new Error(
      `${this.provider} streaming is not yet implemented for Free mode.`,
    );
  }

  abstract validateApiKey(apiKey: string): Promise<ValidationResult>;
}
