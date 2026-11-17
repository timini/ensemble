import type {
  AIProvider,
  ProviderRegistry,
  StreamResponseOptions,
  TokenUsage,
} from '@ensemble-ai/shared-utils/providers';
import {
  PRICE_TABLE,
  costOfTokens,
  getModelPrice,
  usageFromText,
  type EndpointLocation,
} from '@ensemble-ai/shared-utils/pricing';
import { isProviderError } from '@ensemble-ai/shared-utils/providers';
import type { EvalMode, ModelSpec, ProviderResponse } from '../types.js';
import { answerSchema, formatStructuredContent, type AnswerSpec } from './finalAnswer.js';
import { isRateLimitOrServerError, retryable, type RetryOptions } from './retryable.js';

export interface EnsembleRunnerOptions {
  requestDelayMs?: number;
  retry?: RetryOptions;
  temperature?: number;
  /** Called when any API call encounters a rate-limit error (even if retried). */
  onRateLimit?: () => void;
  /** OpenAI-compatible endpoints in use, so their models can be priced (local ones cost 0). */
  endpoints?: EndpointLocation[];
}

export interface RunPromptOptions {
  /** Ask for a structured final answer of this shape (see finalAnswer.ts). */
  answer?: AnswerSpec;
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
  endpoints: readonly EndpointLocation[],
): Pick<ProviderResponse, 'estimatedCostUsd' | 'costFromTextLength' | 'usage'> {
  if (result.error) return {};
  const usage = result.usage ?? usageFromText(prompt, result.content);
  const recorded = {
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      source: result.usage ? ('reported' as const) : ('estimated' as const),
    },
  };
  const price = getModelPrice(provider, model, PRICE_TABLE, endpoints);
  const cost = costOfTokens(price, usage.inputTokens, usage.outputTokens);
  if (cost === null) return recorded;
  return result.usage
    ? { ...recorded, estimatedCostUsd: cost }
    : { ...recorded, estimatedCostUsd: cost, costFromTextLength: true };
}

type StreamResult = Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error' | 'answerSource'> & {
  usage?: TokenUsage;
};

const NO_FALLBACK_KINDS = new Set(['invalid_key', 'missing_key', 'rate_limited', 'timeout', 'provider_unavailable']);

/**
 * True when a failed structured call is worth retrying as a plain reply:
 * the server rejected the format or returned something unparsable. Key,
 * rate-limit, timeout and server errors are reported as they are.
 */
function shouldFallBackToText(error: unknown): boolean {
  if (isProviderError(error) && NO_FALLBACK_KINDS.has(error.kind)) return false;
  if (isRateLimitOrServerError(error)) return false;
  const message = error instanceof Error ? error.message : String(error);
  return !/timed?\s?out|timeout|ETIMEDOUT|aborted|api key|unauthori[sz]ed|\b40[13]\b/i.test(message);
}

/**
 * Ask for a structured final answer. generateStructured tries strict JSON
 * schema first; OpenAI-compatible clients fall back to json_object and then
 * to prompting by themselves. If the call still fails with a format error,
 * the model is asked again for a plain reply, whose "Final answer:" line the
 * evaluator reads (the prompt already asks for one).
 */
async function structuredModelResponse(
  client: AIProvider,
  prompt: string,
  model: string,
  spec: AnswerSpec,
  streamOptions?: StreamResponseOptions,
): Promise<StreamResult> {
  try {
    const result = await client.generateStructured<{ reasoning?: unknown; answer?: unknown }>(
      prompt,
      model,
      answerSchema(spec),
      streamOptions?.temperature !== undefined ? { temperature: streamOptions.temperature } : undefined,
    );
    const usage = result.usage;
    const tokenCount = result.tokenCount ?? (usage ? usage.inputTokens + usage.outputTokens : undefined);
    const answer = result.parsed?.answer;
    const hasAnswer = (typeof answer === 'string' && answer.trim()) || typeof answer === 'number';
    const reasoning = typeof result.parsed?.reasoning === 'string' ? result.parsed.reasoning : '';
    return {
      content: hasAnswer ? formatStructuredContent(reasoning, String(answer).trim()) : result.raw,
      responseTimeMs: result.responseTimeMs,
      tokenCount,
      answerSource: hasAnswer ? 'structured' : 'text',
      ...(usage ? { usage } : {}),
    };
  } catch (error) {
    if (!shouldFallBackToText(error)) {
      return { content: '', responseTimeMs: 0, error: error instanceof Error ? error.message : String(error) };
    }
    const fallback = await streamModelResponse(client, prompt, model, streamOptions);
    return fallback.error ? fallback : { ...fallback, answerSource: 'text' };
  }
}

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
  private readonly endpoints: EndpointLocation[];

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
    this.endpoints = options?.endpoints ?? [];
  }

  async runPrompt(
    prompt: string,
    models: ModelSpec[],
    options: RunPromptOptions = {},
  ): Promise<ProviderResponse[]> {
    const call = (client: AIProvider, model: string) =>
      options.answer
        ? structuredModelResponse(client, prompt, model, options.answer, this.streamOptions)
        : streamModelResponse(client, prompt, model, this.streamOptions);

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
              const r = await call(client, model);
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
        : await call(client, model);

      const { usage: _usage, ...response } = result;
      return {
        provider,
        model,
        ...response,
        ...priceResponse(provider, model, prompt, result, this.endpoints),
      } satisfies ProviderResponse;
    });

    return Promise.all(tasks);
  }
}
