import type {
  AIProvider,
  GenerateStructuredOptions,
  JsonSchema,
  ProviderName,
  StreamResponseOptions,
  StructuredResponse,
  ValidationResult,
} from '../../types';
import { MockProviderClient } from '../mock/MockProviderClient';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';

export interface StreamHandlers {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void;
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
 * Handles API key presence checks and the temporary fallback to mock behaviour
 * for streaming and embeddings until dedicated implementations are available.
 */
export abstract class BaseFreeClient implements AIProvider {
  protected readonly mockClient: MockProviderClient;

  constructor(
    protected readonly provider: ProviderName,
    private readonly getApiKey: () => string | null,
  ) {
    this.mockClient = new MockProviderClient({ providerFilter: provider });
  }

  protected resolveApiKey(): string | null {
    return this.getApiKey();
  }

  /** Default timeout for streaming operations (2 minutes) */
  protected static readonly STREAM_TIMEOUT_MS = 120000;

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    const apiKey = this.resolveApiKey();

    if (!apiKey) {
      onError(
        new Error(
          `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
        ),
      );
      return;
    }

    // Create a timeout promise to prevent hanging streams
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Streaming timeout for ${this.provider} after ${BaseFreeClient.STREAM_TIMEOUT_MS / 1000}s. The API may be unresponsive.`,
          ),
        );
      }, BaseFreeClient.STREAM_TIMEOUT_MS);
    });

    try {
      // Race the stream against the timeout
      await Promise.race([
        this.streamWithProvider({
          apiKey,
          prompt,
          model,
          onChunk,
          onComplete,
          onError,
          streamOptions: options,
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      const safeMessage = sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
        `Streaming failed for ${this.provider}.`,
      );
      onError(new Error(safeMessage));
    } finally {
      // Clean up the timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const apiKey = this.resolveApiKey();

    if (!apiKey) {
      throw new Error(
        `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
      );
    }

    // TODO: Replace fallback with real embeddings implementation.
    return this.mockClient.generateEmbeddings(text);
  }

  listAvailableModels() {
    return this.mockClient.listAvailableModels();
  }

  async listAvailableTextModels(): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
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

    if (!apiKey) {
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
