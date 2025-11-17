import axios from 'axios';
import { BaseFreeClient } from '../base/BaseFreeClient.js';
import type { ValidationResult } from '../../types.js';
import { extractAxiosErrorMessage } from '../../utils/extractAxiosError.js';

interface GoogleModelEntry {
  name?: string;
}

interface GoogleModelsResponse {
  models?: GoogleModelEntry[];
}

export class FreeGoogleClient extends BaseFreeClient {
  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
        params: {
          key: apiKey,
        },
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: extractAxiosErrorMessage(error) };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    const response = await axios.get<GoogleModelsResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        params: {
          key: apiKey,
        },
      },
    );

    const models = response.data?.models ?? [];
    return models
      .map((model) => {
        if (!model.name) return '';
        const segments = model.name.split('/');
        return segments[segments.length - 1] ?? model.name;
      })
      .filter((value): value is string => value.length > 0);
  }
}
