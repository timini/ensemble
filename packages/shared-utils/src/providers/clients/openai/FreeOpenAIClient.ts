import OpenAI from 'openai';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { StructuredResponse, TokenUsage, ValidationResult } from '../../types';
import { hasNonTextModality } from '../../utils/modelFilters';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import { fromChatCompletionUsage, type ChatCompletionUsage } from '../../utils/usage';
import { openAISamplingParams } from './openAIModelRules';
import { requestOpenAICompatibleEmbedding } from '../../embeddings/openAICompatibleEmbeddings';
import { OPENAI_BASE_URL, OPENAI_EMBEDDING_MODEL } from '../../embeddings/models';

export class FreeOpenAIClient extends BaseFreeClient {
  override readonly supportsEmbeddings: boolean = true;

  protected override embedWithProvider(apiKey: string, text: string): Promise<number[]> {
    return requestOpenAICompatibleEmbedding({
      baseURL: OPENAI_BASE_URL,
      apiKey,
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    });
  }

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

      // Listing models checks the key without depending on one model id
      // that OpenAI may later retire.
      await client.models.list();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: sanitizeProviderErrorMessage(
          error instanceof Error ? error.message : String(error),
          'Invalid OpenAI API key.',
        ),
      };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['gpt-6-astra', 'gpt-6-luna'];
    }
    const client = this.createClient(apiKey);

    const response = await client.models.list();
    return response.data
      .map((model) => model.id)
      .filter((id): id is string => {
        if (!id) return false;
        // gpt-* chat models plus o-series reasoning models (o1, o3, o4-mini).
        const isChatCandidate = id.startsWith('gpt-') || /^o\d+($|-)/.test(id);
        if (!isChatCandidate) return false;
        // Exclude models that don't support the Chat Completions endpoint.
        // Patterns derived from probing the OpenAI API (404 = not chat).
        const isNonChat =
          hasNonTextModality(id) ||
          id.includes('realtime') ||
          id.includes('transcribe') ||
          id.includes('codex') ||
          id.includes('instruct') ||
          id.includes('deep-research') ||
          /-pro($|-)/.test(id);
        return !isNonChat;
      });
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
      ...openAISamplingParams(options.model, options.options?.temperature),
    });

    const raw = response.choices[0]?.message?.content ?? '';
    if (!raw) {
      throw new Error('OpenAI returned empty structured output');
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
    const client = this.createClient(options.apiKey);
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;
    let usage: TokenUsage | undefined;

    const stream = await client.chat.completions.create({
      model: options.model,
      stream: true,
      messages: [{ role: 'user', content: options.prompt }],
      stream_options: { include_usage: true },
      ...openAISamplingParams(options.model, options.streamOptions?.temperature),
      ...(options.streamOptions?.seed !== undefined && {
        seed: options.streamOptions.seed,
      }),
    });

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

      if (choice?.finish_reason) {
        // Don't break immediately if usage is coming in the last chunk
      }
    }

    options.onComplete(
      fullResponse,
      Date.now() - startTime,
      tokenCount > 0 ? tokenCount : undefined,
      usage,
    );
  }
}
