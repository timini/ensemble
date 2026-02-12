import OpenAI from 'openai';
import { BaseFreeClient, type StreamOptions } from '../base/BaseFreeClient';
import type { ValidationResult } from '../../types';

export class FreeOpenAIClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      const client = this.createClient(apiKey);

      await client.models.retrieve('gpt-4o-mini');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Invalid OpenAI API key.' };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['gpt-4o', 'gpt-4o-mini'];
    }
    const client = this.createClient(apiKey);

    const response = await client.models.list();
    return response.data
      .map((model) => model.id)
      .filter((id): id is string => {
        if (!id) return false;
        const isChatCandidate =
          id.startsWith('gpt-') || id.startsWith('o1-') || id.startsWith('o3-');
        if (!isChatCandidate) return false;
        // Exclude models that don't support the Chat Completions endpoint.
        // Patterns derived from probing the OpenAI API (404 = not chat).
        const isNonChat =
          id.includes('audio') ||
          id.includes('tts') ||
          id.includes('dall-e') ||
          id.includes('whisper') ||
          id.includes('embedding') ||
          id.includes('realtime') ||
          id.includes('transcribe') ||
          id.includes('image') ||
          id.includes('codex') ||
          id.includes('instruct') ||
          id.includes('deep-research') ||
          /-pro($|-)/.test(id);
        return !isNonChat;
      });
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const client = this.createClient(options.apiKey);
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;

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
        // Don't break immediately if usage is coming in the last chunk
      }
    }

    options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined);
  }
}
