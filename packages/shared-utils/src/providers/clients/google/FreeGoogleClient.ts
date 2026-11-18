import { GoogleGenerativeAI, type ResponseSchema } from '@google/generative-ai';
import axios from 'axios';
import { classifyProviderError } from '../../errors/providerError';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { GenerateEmbeddingsOptions, StructuredResponse, TokenUsage, ValidationResult } from '../../types';
import { extractAxiosErrorMessage } from '../../utils/extractAxiosError';
import { hasNonTextModality } from '../../utils/modelFilters';
import { fromGeminiUsage } from '../../utils/usage';
import { requestGeminiEmbedding } from '../../embeddings/geminiEmbeddings';
import { GOOGLE_EMBEDDING_MODEL } from '../../embeddings/models';

interface GoogleModelEntry {
  name?: string;
}

interface GoogleModelsResponse {
  models?: GoogleModelEntry[];
}

export class FreeGoogleClient extends BaseFreeClient {
  override readonly supportsEmbeddings: boolean = true;

  protected override embedWithProvider(
    apiKey: string,
    text: string,
    options?: GenerateEmbeddingsOptions,
  ): Promise<number[]> {
    return requestGeminiEmbedding({
      apiKey,
      model: GOOGLE_EMBEDDING_MODEL,
      text,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  }

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
        headers: {
          'x-goog-api-key': apiKey,
        },
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: extractAxiosErrorMessage(error) };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['gemini-4-carbon', 'gemini-4-hydrogen'];
    }
    const response = await axios.get<GoogleModelsResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        headers: {
          'x-goog-api-key': apiKey,
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

  /**
   * Strip `additionalProperties` from a schema object (Google's API rejects it).
   * Note: only strips the top-level field. Nested object schemas with
   * `additionalProperties` would need recursive handling if ever used.
   */
  private static sanitizeSchemaForGoogle(schema: Record<string, unknown>): Record<string, unknown> {
    const rest = { ...schema };
    delete rest.additionalProperties;
    return rest;
  }

  protected override async generateStructuredWithProvider<T>(
    options: StructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();

    const genAI = this.createClient(options.apiKey);
    const sanitizedSchema = FreeGoogleClient.sanitizeSchemaForGoogle(
      options.schema.schema as Record<string, unknown>,
    );
    const model = genAI.getGenerativeModel({
      model: options.model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: sanitizedSchema as unknown as ResponseSchema,
        ...(options.options?.temperature !== undefined && {
          temperature: options.options.temperature,
        }),
      },
    });

    const result = await model.generateContent(options.prompt, { signal: options.signal });
    const raw = result.response.text();
    if (!raw) {
      throw new Error('Google returned empty structured output');
    }
    const parsed = JSON.parse(raw) as T;
    const tokenCount = result.response.usageMetadata?.totalTokenCount;
    const usage = fromGeminiUsage(result.response.usageMetadata);

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
      const genAI = this.createClient(options.apiKey);
      const model = genAI.getGenerativeModel({
        model: options.model,
        ...(options.streamOptions?.temperature !== undefined && {
          generationConfig: { temperature: options.streamOptions.temperature },
        }),
      });

      const result = await model.generateContentStream(options.prompt, { signal: options.signal });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullResponse += text;
          options.onChunk(text);
        }
        if (chunk.usageMetadata?.totalTokenCount) {
          tokenCount = chunk.usageMetadata.totalTokenCount;
        }
        usage = fromGeminiUsage(chunk.usageMetadata) ?? usage;
      }

      options.onComplete(
        fullResponse,
        Date.now() - startTime,
        tokenCount > 0 ? tokenCount : undefined,
        usage,
      );
    } catch (error) {
      options.onError(classifyProviderError(error, { provider: this.provider, label: 'Google API error' }));
    }
  }
}
