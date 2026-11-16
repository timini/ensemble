import { BaseFreeClient, type StreamOptions } from '../base/BaseFreeClient';
import type { ValidationResult } from '../../types';
import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';
import {
  PERPLEXITY_API_BASE,
  PERPLEXITY_TEXT_MODELS,
  agentHttpError,
  readAgentEvents,
  toAgentModelSelector,
} from './perplexityAgentApi';

/**
 * Free mode client for Perplexity's Agent API.
 *
 * Sonar Chat Completions ended on 2026-09-27, so this client calls
 * `POST /v1/agent` with plain `fetch` (the endpoint is not at the path the
 * OpenAI SDK's Responses helper expects). Model ids are effort presets; see
 * `perplexityAgentApi.ts`.
 */
export class FreePerplexityClient extends BaseFreeClient {
  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is required.' };
    }

    try {
      // Listing models needs a valid key but runs no model, so it costs nothing.
      const response = await fetch(`${PERPLEXITY_API_BASE}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
      }
      if (!response.ok) {
        throw await agentHttpError(response);
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: sanitizeProviderErrorMessage(
          error instanceof Error ? error.message : String(error),
          'Invalid Perplexity API key.',
        ),
      };
    }
  }

  protected async fetchTextModels(_apiKey: string): Promise<string[]> {
    // GET /v1/models lists provider/model ids from other vendors, which the
    // app already offers directly. The presets are Perplexity's own offering.
    return [...PERPLEXITY_TEXT_MODELS];
  }

  protected override async streamWithProvider(options: StreamOptions): Promise<void> {
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount: number | undefined;

    try {
      // Effort presets fix their own sampling, so temperature and seed are
      // not forwarded.
      const response = await fetch(`${PERPLEXITY_API_BASE}/agent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          ...toAgentModelSelector(options.model),
          input: options.prompt,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw await agentHttpError(response);
      }

      for await (const event of readAgentEvents(response.body)) {
        if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
          fullResponse += event.delta;
          options.onChunk(event.delta);
        } else if (event.type === 'response.completed') {
          tokenCount = event.response?.usage?.total_tokens ?? undefined;
        } else if (event.type === 'response.failed' || event.type === 'error') {
          throw new Error(
            event.response?.error?.message ??
              event.error?.message ??
              event.message ??
              'The Agent API run failed.',
          );
        }
      }

      options.onComplete(fullResponse, Date.now() - startTime, tokenCount || undefined);
    } catch (error) {
      const errorMessage = sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
        'Unknown Perplexity provider error.',
      );
      options.onError(new Error(`Perplexity API error: ${errorMessage}`));
    }
  }
}
