/**
 * FreeAPIClient
 *
 * Real provider implementation for Free Mode (Phase 3).
 * Uses user-supplied API keys stored in the browser to make direct requests
 * to provider SDKs. Streaming and embeddings currently fall back to the mock
 * client until full implementations are completed.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { MockAPIClient } from './MockAPIClient';
import type {
  AIProvider,
  ModelMetadata,
  ValidationResult,
} from '../interfaces/AIProvider';

type ProviderName = 'openai' | 'anthropic' | 'google' | 'xai';

export class FreeAPIClient implements AIProvider {
  private mockClient = new MockAPIClient({ enableErrors: false });

  constructor(
    private readonly provider: ProviderName,
    private readonly getApiKey: () => string | null,
  ) {}

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

    // TODO: Implement real streaming for each provider in Phase 3.1 follow-up.
    console.warn(
      `[FreeAPIClient] Real-time streaming for ${this.provider} not yet implemented. Falling back to mock responses.`,
    );
    await this.mockClient.streamResponse(
      prompt,
      model,
      onChunk,
      onComplete,
      onError,
    );
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error(
        `Missing API key for ${this.provider}. Configure an API key on the configuration page.`,
      );
    }

    // TODO: Implement provider-specific embeddings in Phase 3.2 follow-up.
    console.warn(
      `[FreeAPIClient] Embeddings for ${this.provider} not yet implemented. Falling back to mock embeddings.`,
    );
    return this.mockClient.generateEmbeddings(text);
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        valid: false,
        error: 'API key is required.',
      };
    }

    try {
      switch (this.provider) {
        case 'openai': {
          const client = new OpenAI({
            apiKey,
            dangerouslyAllowBrowser: true,
          });
          await client.models.retrieve('gpt-4o-mini');
          break;
        }
        case 'anthropic': {
          const client = new Anthropic({ apiKey });
          await client.models.list();
          break;
        }
        case 'google': {
          const client = new GoogleGenerativeAI(apiKey);
          const response = await client.listModels();
          if (!response.models?.length) {
            throw new Error('No Gemini models available for this API key.');
          }
          break;
        }
        case 'xai': {
          await axios.get('https://api.x.ai/v1/models', {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          break;
        }
        default: {
          throw new Error(`Unsupported provider: ${this.provider}`);
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  listAvailableModels(): ModelMetadata[] {
    return this.mockClient
      .listAvailableModels()
      .filter((model) => model.provider === this.provider);
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error?.message ??
        error.response?.data?.message ??
        error.message;
      return message ?? 'Unknown error validating API key.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error validating API key.';
  }
}
