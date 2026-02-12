import Anthropic from '@anthropic-ai/sdk';
import { BaseFreeClient, type StreamOptions } from '../base/BaseFreeClient';
import type { ValidationResult } from '../../types';

export class FreeAnthropicClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Safe because keys are user-provided and stored locally
    });
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      const client = this.createClient(apiKey);
      await client.models.list();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid Anthropic API key.',
      };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['claude-3-5-sonnet', 'claude-3-haiku'];
    }
    try {
      const client = this.createClient(apiKey);
      const response = await client.models.list();
      return response.data
        .map((m) => m.id)
        .filter((id) => id.startsWith('claude-'));
    } catch {
      // Fallback to known model list if SDK call fails
      return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    }
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;

    try {
      const client = this.createClient(options.apiKey);

      const stream = await client.messages.create({
        model: options.model,
        max_tokens: 1024, // Default limit
        messages: [{ role: 'user', content: options.prompt }],
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullResponse += text;
          options.onChunk(text);
        } else if (event.type === 'message_delta' && event.usage) {
          // usage.output_tokens is in message_delta
          if (event.usage.output_tokens) {
            tokenCount += event.usage.output_tokens;
          }
        } else if (event.type === 'message_stop') {
          // Final usage might be here or accumulated
        }
      }

      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined);
    } catch (error) {
      // Extract error message from Anthropic SDK error
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      options.onError(new Error(`Anthropic API error: ${errorMessage}`));
    }
  }
}
