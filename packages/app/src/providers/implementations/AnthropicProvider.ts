/**
 * AnthropicProvider
 *
 * Provider implementation for Anthropic models (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
 * Currently uses MockAPIClient for Phase 2.
 * Will be replaced with real Anthropic SDK in Phase 3.
 */

import { MockAPIClient } from '../clients/MockAPIClient';
import type { AIProvider, ModelMetadata, ValidationResult } from '../interfaces/AIProvider';

export class AnthropicProvider implements AIProvider {
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
      .filter((model) => model.provider === 'anthropic');
  }
}
