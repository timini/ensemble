/**
 * XAIProvider
 *
 * Provider implementation for XAI models (Grok-2, Grok-2-mini)
 * Currently uses MockAPIClient for Phase 2.
 * Will be replaced with real XAI API client in Phase 3.
 */

import { MockAPIClient } from '../clients/MockAPIClient';
import type { AIProvider, ModelMetadata, ValidationResult } from '../interfaces/AIProvider';

export class XAIProvider implements AIProvider {
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
      .filter((model) => model.provider === 'xai');
  }
}
