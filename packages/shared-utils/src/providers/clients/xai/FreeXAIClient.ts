import OpenAI from 'openai';
import axios from 'axios';
import { BaseFreeClient, type StreamOptions } from '../base/BaseFreeClient';
import type { ValidationResult } from '../../types';
import { extractAxiosErrorMessage } from '../../utils/extractAxiosError';

interface XaiModelEntry {
  id?: string;
  name?: string;
}

interface XaiModelsResponse {
  data?: XaiModelEntry[];
}

const NON_TEXT_MODALITY_PATTERN =
  /(?:^|[-_])(audio|video|vision|image|imagine|embedding|tts|speech)(?:$|[-_])/i;

export class FreeXAIClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
      dangerouslyAllowBrowser: true,
    });
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      await axios.get('https://api.x.ai/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: extractAxiosErrorMessage(error) };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['grok-beta'];
    }
    const response = await axios.get<XaiModelsResponse>('https://api.x.ai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = response.data?.data ?? [];
    return data
      .map((entry) => entry.id ?? entry.name ?? '')
      .filter(
        (value): value is string =>
          value.length > 0 &&
          value.startsWith('grok-') &&
          !NON_TEXT_MODALITY_PATTERN.test(value),
      );
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
        stream_options: { include_usage: true },
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
      // Extract error message from XAI/OpenAI SDK error
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      options.onError(new Error(`XAI API error: ${errorMessage}`));
    }
  }
}
