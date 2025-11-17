import type { AIProvider, ProviderName, ValidationResult } from '../../types.js';
import { MockProviderClient } from '../mock/MockProviderClient.js';

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

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      onError(
        new Error(
          `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
        ),
      );
      return;
    }

    // TODO: Replace fallback with real streaming implementation.
    await this.mockClient.streamResponse(prompt, model, onChunk, onComplete, onError);
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const apiKey = this.getApiKey();

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

  abstract validateApiKey(apiKey: string): Promise<ValidationResult>;
}
