import axios from 'axios';
import { BaseFreeClient } from '../base/BaseFreeClient.js';
import type { ValidationResult } from '../../types.js';
import { extractAxiosErrorMessage } from '../../utils/extractAxiosError.js';

export class FreeAnthropicClient extends BaseFreeClient {
  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      await axios.get('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: extractAxiosErrorMessage(error) };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    const response = await axios.get('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    const data = Array.isArray(response.data?.data) ? response.data.data : [];
    return data
      .map((entry: { id?: string; model?: string }) => entry.id ?? entry.model ?? '')
      .filter((value): value is string => value.length > 0);
  }
}
