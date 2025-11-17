import axios from 'axios';
import { BaseFreeClient } from '../base/BaseFreeClient.js';
import type { ValidationResult } from '../../types.js';
import { extractAxiosErrorMessage } from '../../utils/extractAxiosError.js';

export class FreeXAIClient extends BaseFreeClient {
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
    const response = await axios.get('https://api.x.ai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = Array.isArray(response.data?.data) ? response.data.data : [];
    return data
      .map((entry: { id?: string; name?: string }) => entry.id ?? entry.name ?? '')
      .filter((value): value is string => value.length > 0);
  }
}
