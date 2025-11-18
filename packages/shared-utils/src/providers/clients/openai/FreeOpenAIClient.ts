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
    const client = this.createClient(apiKey);

    const response = await client.models.list();
    return response.data
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id));
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const client = this.createClient(options.apiKey);
    const startTime = Date.now();
    let fullResponse = '';

    const stream = await client.chat.completions.create({
      model: options.model,
      stream: true,
      messages: [{ role: 'user', content: options.prompt }],
    });

    for await (const chunk of stream as AsyncIterable<{ choices?: Array<{ delta?: { content?: unknown }; finish_reason?: string | null }> }>) {
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
        break;
      }
    }

    options.onComplete(fullResponse, Date.now() - startTime);
  }
}
