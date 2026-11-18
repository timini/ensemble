import OpenAI from 'openai';
import { classifyProviderError } from '../../errors/providerError';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { StructuredResponse, TokenUsage, ValidationResult } from '../../types';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import { fromChatCompletionUsage, type ChatCompletionUsage } from '../../utils/usage';

export class FreeDeepSeekClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
      dangerouslyAllowBrowser: true,
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
        error: sanitizeProviderErrorMessage(
          error instanceof Error ? error.message : String(error),
          'Invalid DeepSeek API key.',
        ),
      };
    }
  }

  protected async fetchTextModels(_apiKey: string): Promise<string[]> {
    // deepseek-chat and deepseek-reasoner were retired on 2026-07-24.
    return ['deepseek-v4-pro', 'deepseek-flash'];
  }

  protected override async generateStructuredWithProvider<T>(
    options: StructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const client = this.createClient(options.apiKey);
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: options.model,
      messages: [{ role: 'user', content: options.prompt }],
      response_format: {
        type: 'json_schema' as const,
        json_schema: {
          name: options.schema.name,
          strict: true,
          schema: options.schema.schema,
        },
      },
      ...(options.options?.temperature !== undefined && {
        temperature: options.options.temperature,
      }),
    }, { signal: options.signal });

    const raw = response.choices[0]?.message?.content ?? '';
    if (!raw) {
      throw new Error('DeepSeek returned empty structured output');
    }
    const parsed = JSON.parse(raw) as T;
    const tokenCount = response.usage?.total_tokens;
    const usage = fromChatCompletionUsage(response.usage);

    return {
      parsed,
      raw,
      responseTimeMs: Date.now() - startTime,
      ...(tokenCount ? { tokenCount } : {}),
      ...(usage ? { usage } : {}),
    };
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;
    let usage: TokenUsage | undefined;

    try {
      const client = this.createClient(options.apiKey);

      const stream = await client.chat.completions.create({
        model: options.model,
        stream: true,
        messages: [{ role: 'user', content: options.prompt }],
        stream_options: { include_usage: true },
        ...(options.streamOptions?.temperature !== undefined && {
          temperature: options.streamOptions.temperature,
        }),
        ...(options.streamOptions?.seed !== undefined && {
          seed: options.streamOptions.seed,
        }),
      }, { signal: options.signal });

      for await (const chunk of stream as AsyncIterable<{
        choices?: { delta?: { content?: unknown }; finish_reason?: string | null }[];
        usage?: ChatCompletionUsage | null;
      }>) {
        if (chunk.usage?.total_tokens) {
          tokenCount = chunk.usage.total_tokens;
        }
        usage = fromChatCompletionUsage(chunk.usage) ?? usage;

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
      }

      options.onComplete(
      fullResponse,
      Date.now() - startTime,
      tokenCount > 0 ? tokenCount : undefined,
      usage,
    );
    } catch (error) {
      options.onError(classifyProviderError(error, { provider: this.provider, label: 'DeepSeek API error' }));
    }
  }
}
