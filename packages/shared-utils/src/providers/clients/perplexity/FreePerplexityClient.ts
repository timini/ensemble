import OpenAI from 'openai';
import { BaseFreeClient, type StreamOptions } from '../base/BaseFreeClient';
import type { ValidationResult } from '../../types';

export class FreePerplexityClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai',
      dangerouslyAllowBrowser: true,
    });
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      const client = this.createClient(apiKey);
      await client.chat.completions.create({
        model: 'sonar',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      });
      return { valid: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  protected async fetchTextModels(_apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['sonar', 'sonar-pro', 'sonar-reasoning'];
    }
    return [
      'sonar',
      'sonar-pro',
      'sonar-deep-research',
      'sonar-reasoning',
      'sonar-reasoning-pro',
    ];
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;

    try {
      const client = this.createClient(options.apiKey);

      const stream = await client.chat.completions.create({
        model: options.model,
        stream: true,
        messages: [{ role: 'user', content: options.prompt }],
      });

      for await (const chunk of stream as AsyncIterable<{
        choices?: { delta?: { content?: unknown }; finish_reason?: string | null }[];
        usage?: { total_tokens?: number };
      }>) {
        if (chunk.usage?.total_tokens) {
          tokenCount = chunk.usage.total_tokens;
        }

        const choice = chunk.choices?.[0];
        const deltaContent = choice?.delta?.content;

        if (typeof deltaContent === 'string') {
          fullResponse += deltaContent;
          options.onChunk(deltaContent);
        } else if (Array.isArray(deltaContent)) {
          for (const piece of deltaContent) {
            if (typeof piece === 'string') {
              fullResponse += piece;
              options.onChunk(piece);
            } else if (piece && typeof (piece as { text?: string }).text === 'string') {
              const text = (piece as { text?: string }).text as string;
              fullResponse += text;
              options.onChunk(text);
            }
          }
        }

        if (choice?.finish_reason) {
          // Stream complete
        }
      }

      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      options.onError(new Error(`Perplexity API error: ${errorMessage}`));
    }
  }
}
