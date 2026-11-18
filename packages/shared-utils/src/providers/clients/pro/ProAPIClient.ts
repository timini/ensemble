import type {
  AIProvider,
  GenerateEmbeddingsOptions,
  GenerateStructuredOptions,
  JsonSchema,
  ModelMetadata,
  ProviderName,
  StreamResponseOptions,
  StructuredResponse,
  TokenUsage,
  ValidationResult,
} from '../../types';
import { MockProviderClient } from '../mock/MockProviderClient';
import { DEFAULT_STREAM_TIMEOUT_MS } from '../base/BaseFreeClient';
import { ProviderError, cancelledError, classifyProviderError } from '../../errors/providerError';

/** One streamed text call, as the Pro server takes it. */
export interface ProStreamRequest {
  provider: ProviderName;
  model: string;
  prompt: string;
  temperature?: number;
  seed?: number;
}

export interface ProStreamResult {
  response: string;
  responseTimeMs: number;
  usage?: TokenUsage;
}

export interface ProStructuredRequest {
  provider: ProviderName;
  model: string;
  prompt: string;
  schema: JsonSchema;
  temperature?: number;
}

export interface ProEmbeddingsRequest {
  provider: ProviderName;
  text: string;
}

/**
 * How a ProAPIClient reaches the server. The app implements it over tRPC
 * (the streamTextEvents subscription and two mutations) and adds the run
 * id, so billing stays out of the client. Every method rejects with an
 * error when the call fails and must abort its request when `signal` fires.
 */
export interface ProTransport {
  streamText(
    request: ProStreamRequest,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<ProStreamResult>;
  generateStructured(request: ProStructuredRequest, signal?: AbortSignal): Promise<StructuredResponse<unknown>>;
  generateEmbeddings(request: ProEmbeddingsRequest, signal?: AbortSignal): Promise<number[]>;
}

/**
 * Pro mode client: the same AIProvider as the Free clients, but every call
 * goes to our server, which calls the model with the server key and bills
 * the user's credits. Errors come back as ProviderErrors with a kind, so the
 * UI treats them like Free mode errors (`insufficient_credits` is Pro only).
 */
export class ProAPIClient implements AIProvider {
  private readonly staticModels: MockProviderClient;

  constructor(
    private readonly provider: ProviderName,
    private readonly transport: ProTransport,
  ) {
    this.staticModels = new MockProviderClient({ providerFilter: provider });
  }

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number, usage?: TokenUsage) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    if (options?.signal?.aborted) {
      onError(cancelledError(this.provider));
      return;
    }

    // Our own controller aborts the transport on a cancel or a timeout.
    const controller = new AbortController();
    let settled = false;
    let release: () => void = () => undefined;
    // Resolves on a cancel or a timeout, so a transport that never settles cannot hold the call.
    const stopped = new Promise<null>((resolve) => {
      release = () => resolve(null);
    });
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      controller.abort();
      release();
      onError(classifyProviderError(error, { provider: this.provider }));
    };
    const onAbort = () => fail(cancelledError(this.provider));
    options?.signal?.addEventListener('abort', onAbort, { once: true });
    const timeoutMs = options?.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS;
    const timer = setTimeout(() => {
      fail(
        new ProviderError(`Streaming timeout for ${this.provider} after ${Math.round(timeoutMs / 1000)}s.`, 'timeout', {
          provider: this.provider,
        }),
      );
    }, timeoutMs);

    try {
      const call = this.transport.streamText(
        {
          provider: this.provider,
          model,
          prompt,
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          ...(options?.seed !== undefined && { seed: options.seed }),
        },
        (chunk) => {
          if (!settled) onChunk(chunk);
        },
        controller.signal,
      );
      // A late rejection after a cancel is already reported.
      call.catch(() => undefined);
      const result = await Promise.race([call, stopped]);
      if (result && !settled) {
        settled = true;
        const tokens = result.usage ? result.usage.inputTokens + result.usage.outputTokens : undefined;
        onComplete(result.response, result.responseTimeMs, tokens, result.usage);
      }
    } catch (error) {
      fail(error);
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  async generateStructured<T>(
    prompt: string,
    model: string,
    schema: JsonSchema,
    options?: GenerateStructuredOptions,
  ): Promise<StructuredResponse<T>> {
    if (options?.signal?.aborted) throw cancelledError(this.provider);
    try {
      const result = await this.transport.generateStructured(
        {
          provider: this.provider,
          model,
          prompt,
          schema,
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
        },
        options?.signal,
      );
      return result as StructuredResponse<T>;
    } catch (error) {
      throw classifyProviderError(error, { provider: this.provider });
    }
  }

  async generateEmbeddings(text: string, options?: GenerateEmbeddingsOptions): Promise<number[]> {
    if (options?.signal?.aborted) throw cancelledError(this.provider);
    try {
      return await this.transport.generateEmbeddings({ provider: this.provider, text }, options?.signal);
    } catch (error) {
      throw classifyProviderError(error, { provider: this.provider });
    }
  }

  /** Pro mode uses the server key, so there is nothing to validate. */
  async validateApiKey(_apiKey: string): Promise<ValidationResult> {
    return { valid: true };
  }

  listAvailableModels(): ModelMetadata[] {
    return this.staticModels.listAvailableModels();
  }

  listAvailableTextModels(): Promise<string[]> {
    return this.staticModels.listAvailableTextModels();
  }
}
