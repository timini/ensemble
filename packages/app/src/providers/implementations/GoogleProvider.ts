/**
 * GoogleProvider
 *
 * Provider implementation for Google models (Gemini 1.5 Pro, Gemini 1.5 Flash)
 * Currently uses MockAPIClient for Phase 2.
 * Will be replaced with real Google Generative AI SDK in Phase 3.
 */

import { MockAPIClient } from '../clients/MockAPIClient';
import type { AIProvider, ModelMetadata, ValidationResult } from '../interfaces/AIProvider';

export class GoogleProvider implements AIProvider {
  private client: MockAPIClient;

  constructor() {
    this.client = new MockAPIClient();
  }

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    await this.client.streamResponse(prompt, model, onChunk, onComplete, onError);
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    return this.client.generateEmbeddings(text);
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    return this.client.validateApiKey(apiKey);
  }

  listAvailableModels(): ModelMetadata[] {
    return this.client
      .listAvailableModels()
      .filter((model) => model.provider === 'google');
  }
}
