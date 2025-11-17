import OpenAI from 'openai';
import { BaseFreeClient } from '../base/BaseFreeClient.js';
import type { ValidationResult } from '../../types.js';

export class FreeOpenAIClient extends BaseFreeClient {
  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      const client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      await client.models.retrieve('gpt-4o-mini');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Invalid OpenAI API key.' };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    const client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.models.list();
    return response.data
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id));
  }
}
