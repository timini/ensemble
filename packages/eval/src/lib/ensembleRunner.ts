import type {
  AIProvider,
  ProviderRegistry,
  StreamResponseOptions,
  TokenUsage,
} from '@ensemble-ai/shared-utils/providers';
import { costOfTokens, getModelPrice, usageFromText } from '@ensemble-ai/shared-utils/pricing';
import type { EvalMode, ModelSpec, ProviderResponse } from '../types.js';
import { isRateLimitOrServerError, retryable, type RetryOptions } from './retryable.js';

export interface EnsembleRunnerOptions {
  requestDelayMs?: number;
  retry?: RetryOptions;
  temperature?: number;
  /** Called when any API call encounters a rate-limit error (even if retried). */
  onRateLimit?: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Price one answer with the shared price table. Uses the usage the provider
 * reported, or estimates tokens from prompt and answer length when it
 * reported none. Returns no cost for failed calls or models with no price.
 */
function priceResponse(
  provider: string,
  model: string,
  prompt: string,
  result: StreamResult,
): Pick<ProviderResponse, 'estimatedCostUsd' | 'costFromTextLength'> {
  if (result.error) return {};
  const usage = result.usage ?? usageFromText(prompt, result.content);
  const cost = costOfTokens(getModelPrice(provider, model), usage.inputTokens, usage.outputTokens);
  if (cost === null) return {};
  return result.usage ? { estimatedCostUsd: cost } : { estimatedCostUsd: cost, costFromTextLength: true };
}

type StreamResult = Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error'> & {
  usage?: TokenUsage;
};

async function streamModelResponse(
  client: AIProvider,
  prompt: string,
  model: string,
  streamOptions?: StreamResponseOptions,
): Promise<StreamResult> {
  return new Promise((resolve) => {
    let content = '';
    let settled = false;

    const safeResolve = (value: StreamResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    client
      .streamResponse(
        prompt,
        model,
        (chunk) => {
          content += chunk;
        },
        (fullResponse, responseTime, tokenCount, usage) => {
          safeResolve({
            content: fullResponse || content,
            responseTimeMs: responseTime,
            tokenCount,
            ...(usage ? { usage } : {}),
          });
        },
        (error) => {
          safeResolve({
            content,
            responseTimeMs: 0,
            error: error.message,
          });
        },
        streamOptions,
      )
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        safeResolve({
          content,
          responseTimeMs: 0,
          error: message,
        });
      });
  });
}

export class EnsembleRunner {
  private readonly requestDelayMs: number;
  private readonly retryOptions: RetryOptions | undefined;
  private readonly streamOptions: StreamResponseOptions | undefined;

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly mode: EvalMode,
    options?: EnsembleRunnerOptions,
  ) {
    this.requestDelayMs = Math.max(0, options?.requestDelayMs ?? 0);
    this.retryOptions = options?.retry
      ? { ...options.retry, onRateLimit: options.onRateLimit }
      : options?.onRateLimit
        ? { onRateLimit: options.onRateLimit }
        : undefined;
    this.streamOptions =
      options?.temperature !== undefined ? { temperature: options.temperature } : undefined;
  }

  async runPrompt(prompt: string, models: ModelSpec[]): Promise<ProviderResponse[]> {
    const tasks = models.map(async ({ provider, model }, index) => {
      // Stagger model requests: model 0 starts immediately, model 1 after requestDelayMs,
      // model 2 after 2*requestDelayMs, etc. All promises are launched concurrently via
      // Promise.all, but each internally sleeps before making the API call.
      // Note: the stagger sleep is intentionally outside the retryable wrapper so that
      // retries do NOT re-apply the initial stagger delay.
      if (this.requestDelayMs > 0 && index > 0) {
        await sleep(index * this.requestDelayMs);
      }

      const client = this.registry.getProvider(provider, this.mode);
      const result: StreamResult = this.retryOptions
        ? await retryable(
            async () => {
              const r = await streamModelResponse(client, prompt, model, this.streamOptions);
              if (r.error && isRateLimitOrServerError(new Error(r.error))) {
                throw new Error(r.error);
              }
              return r;
            },
            this.retryOptions,
          ).catch((error: unknown): StreamResult => ({
            content: '',
            responseTimeMs: 0,
            tokenCount: undefined,
            error: error instanceof Error ? error.message : String(error),
          }))
        : await streamModelResponse(client, prompt, model, this.streamOptions);

      const { usage: _usage, ...response } = result;
      return {
        provider,
        model,
        ...response,
        ...priceResponse(provider, model, prompt, result),
      } satisfies ProviderResponse;
    });

    return Promise.all(tasks);
  }
}
