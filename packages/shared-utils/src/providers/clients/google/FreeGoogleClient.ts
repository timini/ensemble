import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { StructuredResponse, ValidationResult } from '../../types';
import { extractAxiosErrorMessage } from '../../utils/extractAxiosError';
import { hasNonTextModality } from '../../utils/modelFilters';

interface GoogleModelEntry {
  name?: string;
}

interface GoogleModelsResponse {
  models?: GoogleModelEntry[];
}

export class FreeGoogleClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new GoogleGenerativeAI(apiKey);
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      // Validate using axios to avoid SDK overhead for simple check, or stick to axios for validation
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
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['gemini-1.5-flash', 'gemini-1.5-pro'];
    }
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
      .filter(
        (value): value is string =>
          value.length > 0 &&
          value.startsWith('gemini-') &&
          !hasNonTextModality(value),
      );
  }

  protected override async generateStructuredWithProvider<T>(
    options: StructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();

    const genAI = this.createClient(options.apiKey);
    const model = genAI.getGenerativeModel({
      model: options.model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: options.schema.schema as unknown as import('@google/generative-ai').ResponseSchema,
        ...(options.options?.temperature !== undefined && {
          temperature: options.options.temperature,
        }),
      },
    });

    const result = await model.generateContent(options.prompt);
    const raw = result.response.text();
    if (!raw) {
      throw new Error('Google returned empty structured output');
    }
    const parsed = JSON.parse(raw) as T;
    const tokenCount = result.response.usageMetadata?.totalTokenCount;

    return {
      parsed,
      raw,
      responseTimeMs: Date.now() - startTime,
      ...(tokenCount ? { tokenCount } : {}),
    };
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;

    try {
      const genAI = this.createClient(options.apiKey);
      const model = genAI.getGenerativeModel({
        model: options.model,
        ...(options.streamOptions?.temperature !== undefined && {
          generationConfig: { temperature: options.streamOptions.temperature },
        }),
      });

      const result = await model.generateContentStream(options.prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullResponse += text;
          options.onChunk(text);
        }
        if (chunk.usageMetadata?.totalTokenCount) {
          tokenCount = chunk.usageMetadata.totalTokenCount;
        }
      }

      options.onComplete(fullResponse, Date.now() - startTime, tokenCount > 0 ? tokenCount : undefined);
    } catch (error) {
      // Extract error message from Google SDK error
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      options.onError(new Error(`Google API error: ${errorMessage}`));
    }
  }
}
