import OpenAI from 'openai';
import { BaseFreeClient, type StreamOptions } from '../base/BaseFreeClient';
import type { ValidationResult } from '../../types';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';

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
      const safeMessage = sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
        'Invalid Perplexity API key.',
      );
      if (safeMessage.includes('401')) {
        return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
      }
      return {
        valid: false,
        error: safeMessage,
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
        stream_options: { include_usage: true },
        messages: [{ role: 'user', content: options.prompt }],
      });

      for await (const chunk of stream as AsyncIterable<{
        choices?: { delta?: { content?: unknown } }[];
        usage?: { total_tokens?: number };
      }>) {
        if (chunk.usage?.total_tokens) {
          tokenCount = chunk.usage.total_tokens;
        }

        const deltaContent = chunk.choices?.[0]?.delta?.content;

        if (typeof deltaContent === 'string') {
          fullResponse += deltaContent;
          options.onChunk(deltaContent);
        }
      }

      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined);
    } catch (error) {
      const errorMessage = sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
        'Unknown Perplexity provider error.',
      );
      options.onError(new Error(`Perplexity API error: ${errorMessage}`));
    }
  }
}
