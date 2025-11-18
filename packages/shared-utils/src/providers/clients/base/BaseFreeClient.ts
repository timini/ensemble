import type { AIProvider, ProviderName, ValidationResult } from '../../types';
import { MockProviderClient } from '../mock/MockProviderClient';

export type StreamHandlers = {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string, responseTime: number) => void;
  onError: (error: Error) => void;
};

export interface StreamOptions extends StreamHandlers {
  apiKey: string;
  prompt: string;
  model: string;
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

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void,
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

    try {
      await this.streamWithProvider({
        apiKey,
        prompt,
        model,
        onChunk,
        onComplete,
        onError,
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
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
      console.warn(`Falling back to default text models for ${this.provider}`, error);
      return this.mockClient.listAvailableTextModels();
    }
  }

  protected async fetchTextModels(_apiKey: string): Promise<string[]> {
    return this.mockClient.listAvailableTextModels();
  }

  protected async streamWithProvider(_options: StreamOptions): Promise<void> {
    throw new Error(
      `${this.provider} streaming is not yet implemented for Free mode.`,
    );
  }

  abstract validateApiKey(apiKey: string): Promise<ValidationResult>;
}
