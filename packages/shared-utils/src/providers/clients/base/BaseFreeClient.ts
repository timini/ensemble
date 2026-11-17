import type {
  AIProvider,
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
import { ProviderError, classifyProviderError, isProviderError } from '../../errors/providerError';
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
  /** Aborted on timeout or when the caller's signal aborts. Pass it to fetch. */
  signal?: AbortSignal;
}

export interface StructuredOptions {
  apiKey: string;
  prompt: string;
  model: string;
  schema: JsonSchema;
  options?: GenerateStructuredOptions;
  /** Aborted on timeout or when the caller's signal aborts. Pass it to fetch. */
  signal?: AbortSignal;
}

interface AbortLimits {
  timeoutMs?: number;
  signal?: AbortSignal;
  timeoutError: () => ProviderError;
  abortError: () => ProviderError;
}

/** The ProviderError a signal was aborted with, if any. */
function abortReason(signal: AbortSignal): ProviderError | undefined {
  return signal.aborted && isProviderError(signal.reason) ? signal.reason : undefined;
}

/**
 * Run `work` with an AbortSignal that fires when the time limit passes or the
 * caller's signal aborts. The returned promise rejects at that moment with the
 * matching ProviderError, and the signal cancels the request underneath, so a
 * call that ran out of time does not keep its connection open.
 */
async function runAbortable<T>(work: (signal: AbortSignal) => Promise<T>, limits: AbortLimits): Promise<T> {
  const controller = new AbortController();
  let rejectAbort: (error: ProviderError) => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abortWith = (error: ProviderError) => {
    if (controller.signal.aborted) return;
    controller.abort(error);
    rejectAbort(error);
  };
  const onCallerAbort = () => abortWith(limits.abortError());

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (limits.timeoutMs !== undefined && limits.timeoutMs > 0) {
    timeoutId = setTimeout(() => abortWith(limits.timeoutError()), limits.timeoutMs);
  }
  if (limits.signal?.aborted) onCallerAbort();
  else limits.signal?.addEventListener('abort', onCallerAbort, { once: true });

  try {
    // A request cancelled by the signal fails with a bare AbortError; report
    // the reason it was cancelled instead.
    const running = work(controller.signal).catch((error: unknown) => {
      throw abortReason(controller.signal) ?? error;
    });
    return await Promise.race([running, aborted]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
    limits.signal?.removeEventListener('abort', onCallerAbort);
  }
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
    try {
      await runAbortable(
        (signal) =>
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
            onError: (error) => report(abortReason(signal) ?? error),
            streamOptions: options,
            signal,
          }),
        {
          timeoutMs,
          signal: options?.signal,
          timeoutError: () =>
            new ProviderError(
              `Streaming timeout for ${this.provider} after ${Math.round(timeoutMs / 1000)}s. The API may be unresponsive.`,
              'timeout',
              { provider: this.provider },
            ),
          abortError: () => this.abortedError(),
        },
      );
    } catch (error) {
      report(error);
    }
  }

  private abortedError(): ProviderError {
    return new ProviderError(`Request to ${this.provider} was aborted.`, 'timeout', { provider: this.provider });
  }

  /** True when this client implements embedWithProvider. */
  readonly supportsEmbeddings: boolean = false;

  async generateEmbeddings(text: string): Promise<number[]> {
    if (!this.supportsEmbeddings) {
      throw new EmbeddingsNotSupportedError(this.provider);
    }

    const apiKey = this.resolveApiKey();

    if (apiKey === null || (this.requiresApiKey && !apiKey)) {
      throw new Error(
        `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
      );
    }

    return this.embedWithProvider(apiKey, text);
  }

  /** Provider-specific embeddings call. Override together with supportsEmbeddings. */
  protected async embedWithProvider(_apiKey: string, _text: string): Promise<number[]> {
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
    const apiKey = this.resolveApiKey();

    if (apiKey === null || (this.requiresApiKey && !apiKey)) {
      throw new Error(
        `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
      );
    }

    const timeoutMs = options?.timeoutMs;
    if (timeoutMs === undefined && !options?.signal) {
      return this.generateStructuredWithProvider<T>({ apiKey, prompt, model, schema, options });
    }
    return runAbortable(
      (signal) => this.generateStructuredWithProvider<T>({ apiKey, prompt, model, schema, options, signal }),
      {
        timeoutMs,
        signal: options?.signal,
        timeoutError: () =>
          new ProviderError(
            `Structured output timeout for ${this.provider} after ${Math.round((timeoutMs ?? 0) / 1000)}s. The API may be unresponsive.`,
            'timeout',
            { provider: this.provider },
          ),
        abortError: () => this.abortedError(),
      },
    );
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
