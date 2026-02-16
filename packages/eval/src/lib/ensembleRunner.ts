import type {
  AIProvider,
  ModelMetadata,
  ProviderRegistry,
  StreamResponseOptions,
} from '@ensemble-ai/shared-utils/providers';
import type { EvalMode, ModelSpec, ProviderResponse } from '../types.js';
import { isRateLimitOrServerError, retryable, type RetryOptions } from './retryable.js';

export interface EnsembleRunnerOptions {
  requestDelayMs?: number;
  retry?: RetryOptions;
  temperature?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateCostUsd(
  tokenCount: number | undefined,
  metadata: ModelMetadata | null,
): number | undefined {
  if (!metadata || tokenCount === undefined || tokenCount <= 0) {
    return undefined;
  }

  return (tokenCount / 1000) * metadata.costPer1kTokens;
}

async function streamModelResponse(
  client: AIProvider,
  prompt: string,
  model: string,
  streamOptions?: StreamResponseOptions,
): Promise<Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error'>> {
  return new Promise((resolve) => {
    let content = '';
    let settled = false;

    const safeResolve = (
      value: Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error'>,
    ) => {
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
        (fullResponse, responseTime, tokenCount) => {
          safeResolve({
            content: fullResponse || content,
            responseTimeMs: responseTime,
            tokenCount,
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
    this.retryOptions = options?.retry;
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
      const metadata =
        client.listAvailableModels().find((candidate) => candidate.id === model) ?? null;

      type StreamResult = Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error'>;
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

      const estimatedCostUsd = estimateCostUsd(result.tokenCount, metadata);

      return {
        provider,
        model,
        ...result,
        ...(estimatedCostUsd === undefined ? {} : { estimatedCostUsd }),
      } satisfies ProviderResponse;
    });

    return Promise.all(tasks);
  }
}
