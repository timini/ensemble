import Anthropic from '@anthropic-ai/sdk';
import { BaseFreeClient, type StreamOptions, type StructuredOptions } from '../base/BaseFreeClient';
import type { StructuredResponse, ValidationResult } from '../../types';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import { acceptsSamplingParams, supportsStructuredOutputs } from './anthropicModelRules';

/**
 * Claude 5.5 models think by default and thinking tokens count against
 * `max_tokens`, so the old 1024 limit cut answers short. These are ceilings,
 * not targets: billing follows the tokens actually generated.
 */
const STREAM_MAX_TOKENS = 16000;
const STRUCTURED_MAX_TOKENS = 8000;

type StructuredOutputBody = Anthropic.MessageCreateParamsNonStreaming & {
  output_config: { format: { type: 'json_schema'; schema: Record<string, unknown> } };
};

/** Returns `{ temperature }` only when it was requested and the model accepts it. */
function samplingParams(model: string, temperature: number | undefined): { temperature?: number } {
  return temperature !== undefined && acceptsSamplingParams(model) ? { temperature } : {};
}

function tokenCountOf(response: Anthropic.Message): { tokenCount?: number } {
  const total = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  return total > 0 ? { tokenCount: total } : {};
}

export class FreeAnthropicClient extends BaseFreeClient {
  private createClient(apiKey: string) {
    return new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Safe because keys are user-provided and stored locally
    });
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      const client = this.createClient(apiKey);
      await client.models.list();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Anthropic.APIError && error.status === 401
            ? 'Invalid Anthropic API key.'
            : sanitizeProviderErrorMessage(
                error instanceof Error ? error.message : String(error),
                'Invalid Anthropic API key.',
              ),
      };
    }
  }

  protected async fetchTextModels(apiKey: string): Promise<string[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return ['claude-sonnet-5-5', 'claude-haiku-5-5'];
    }
    try {
      const client = this.createClient(apiKey);
      const response = await client.models.list();
      return response.data
        .map((m) => m.id)
        .filter((id) => id.startsWith('claude-'));
    } catch {
      // Fallback to known model list if SDK call fails
      return ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
    }
  }

  protected override async generateStructuredWithProvider<T>(
    options: StructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const client = this.createClient(options.apiKey);
    const startTime = Date.now();
    const temperature = samplingParams(options.model, options.options?.temperature);

    if (!supportsStructuredOutputs(options.model)) {
      return this.generateWithForcedTool<T>(client, options, startTime, temperature);
    }

    // Structured outputs replace the forced tool call, which Claude Opus 5.5,
    // Sonnet 5.5 and Fable 5.1+ reject with HTTP 400. The installed SDK
    // version does not type `output_config` yet, so the body is widened.
    const body: StructuredOutputBody = {
      model: options.model,
      max_tokens: STRUCTURED_MAX_TOKENS,
      messages: [{ role: 'user', content: options.prompt }],
      output_config: {
        format: { type: 'json_schema', schema: options.schema.schema },
      },
      ...temperature,
    };
    const response = await client.messages.create(body);

    if (response.stop_reason === 'refusal') {
      throw new Error('Anthropic refused to produce structured output for this prompt.');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('Anthropic structured output was cut off by max_tokens.');
    }

    const raw = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    if (!raw) {
      throw new Error('Anthropic returned empty structured output.');
    }

    return {
      parsed: JSON.parse(raw) as T,
      raw,
      responseTimeMs: Date.now() - startTime,
      ...tokenCountOf(response),
    };
  }

  /** Forced tool call for models released before structured outputs. */
  private async generateWithForcedTool<T>(
    client: Anthropic,
    options: StructuredOptions,
    startTime: number,
    temperature: { temperature?: number },
  ): Promise<StructuredResponse<T>> {
    const response = await client.messages.create({
      model: options.model,
      max_tokens: STRUCTURED_MAX_TOKENS,
      messages: [{ role: 'user', content: options.prompt }],
      tools: [
        {
          name: options.schema.name,
          description: 'Extract structured data from the response.',
          input_schema: options.schema.schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool' as const, name: options.schema.name },
      ...temperature,
    });

    const toolBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolBlock) {
      throw new Error('Anthropic did not return a tool_use block for structured output.');
    }

    const parsed = toolBlock.input as T;
    return {
      parsed,
      raw: JSON.stringify(parsed),
      responseTimeMs: Date.now() - startTime,
      ...tokenCountOf(response),
    };
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const client = this.createClient(options.apiKey);

      const stream = await client.messages.create({
        model: options.model,
        max_tokens: STREAM_MAX_TOKENS,
        messages: [{ role: 'user', content: options.prompt }],
        stream: true,
        ...samplingParams(options.model, options.streamOptions?.temperature),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullResponse += text;
          options.onChunk(text);
        } else if (event.type === 'message_start') {
          // Input tokens are reported once, at the start of the message.
          inputTokens = event.message.usage?.input_tokens ?? 0;
        } else if (event.type === 'message_delta' && event.usage) {
          // output_tokens in message_delta is the running total, not an increment.
          if (event.usage.output_tokens) {
            outputTokens = event.usage.output_tokens;
          }
        }
      }

      const tokenCount = inputTokens + outputTokens;
      options.onComplete(
        fullResponse,
        Date.now() - startTime,
        tokenCount > 0 ? tokenCount : undefined,
        tokenCount > 0 ? { inputTokens, outputTokens } : undefined,
      );
    } catch (error) {
      // Extract error message from Anthropic SDK error
      const errorMessage = sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
        'Unknown Anthropic provider error.',
      );
      options.onError(new Error(`Anthropic API error: ${errorMessage}`));
    }
  }
}
