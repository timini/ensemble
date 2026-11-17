import type {
  AIProvider,
  ProviderRegistry,
  ProviderRouting,
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
import { isRateLimitOrServerError, isTransientError, retryable, type RetryOptions } from './retryable.js';

export interface EnsembleRunnerOptions {
  requestDelayMs?: number;
  retry?: RetryOptions;
  temperature?: number;
  /** Called when any API call encounters a rate-limit error (even if retried). */
  onRateLimit?: () => void;
  /** OpenAI-compatible endpoints in use, so their models can be priced (local ones cost 0). */
  endpoints?: EndpointLocation[];
  /**
   * Limit for one model call, in ms. The request is aborted when it passes
   * and the attempt counts as a transient failure (retried when retry is set).
   * Defaults to the client's own limit (120 s for streams, none for structured calls).
   */
  callTimeoutMs?: number;
  /** Host routing per model (OpenRouter), such as hosts to avoid. */
  routingFor?: (spec: ModelSpec) => ProviderRouting | undefined;
}

export interface RunPromptOptions {
  /** Ask for a structured final answer of this shape (see finalAnswer.ts). */
  answer?: AnswerSpec;
  /** Aborts every call of this prompt, retries included (the question ran out of time). */
  signal?: AbortSignal;
  /**
   * Time (epoch ms) by which every call must be over. No retry starts that
   * could not finish by then, and calls still running at that time are
   * aborted and recorded as timed out, so the question limit never cuts
   * off answers that came back.
   */
  deadline?: number;
  /** Called with each model's response (by index in `models`) as soon as it is final. */
  onResponse?: (index: number, response: ProviderResponse) => void;
}

/** Message of a call stopped at its deadline; failureOf reads it as a timeout. */
export const DEADLINE_MESSAGE = 'Call timed out at the question deadline; no time was left for it to finish.';

/**
 * A signal that aborts when `signal` does or when `deadline` passes. The
 * returned dispose clears the timer.
 */
export function deadlineSignal(
  signal: AbortSignal | undefined,
  deadline: number | undefined,
): { signal: AbortSignal | undefined; dispose: () => void } {
  if (deadline === undefined) return { signal, dispose: () => undefined };
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal!.reason);
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(DEADLINE_MESSAGE)), Math.max(0, deadline - Date.now()));
  timer.unref?.();
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
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

type StreamResult = Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error' | 'answerSource' | 'structuredFallback'> & {
  usage?: TokenUsage;
  /** The error object behind `error`, kept so retries can read its kind and Retry-After. */
  cause?: unknown;
};

function failed(error: unknown, content = ''): StreamResult {
  return { content, responseTimeMs: 0, error: error instanceof Error ? error.message : String(error), cause: error };
}

/**
 * A call that returned no text is a failed call, whatever the provider said.
 * Scoring it as an answer would count an outage as a wrong answer.
 */
function emptyAsError(result: StreamResult, model: string): StreamResult {
  if (result.error || result.content.trim()) return result;
  return failed(new Error(`Empty response from ${model}: the call returned no text.`));
}

const NO_FALLBACK_KINDS = new Set(['invalid_key', 'missing_key', 'rate_limited', 'timeout', 'provider_unavailable']);

/** True for the error a client raises when a completion carried no answer text. */
export function isEmptyResponseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /^(OpenAI-compatible [^:]*: )?Empty response from /i.test(message);
}

/**
 * True when a failed structured call is worth retrying as a plain reply:
 * the server rejected the format, returned something unparsable or returned
 * nothing (an empty structured reply may still answer in plain text; an
 * empty plain reply is then an error and retried). Key, rate-limit,
 * timeout, network and server errors are reported as they are.
 */
function shouldFallBackToText(error: unknown): boolean {
  if (isEmptyResponseError(error)) return true;
  if (isProviderError(error) && NO_FALLBACK_KINDS.has(error.kind)) return false;
  // Network failures and empty completions are retried as they are; a plain
  // reply would hide them.
  if (isRateLimitOrServerError(error) || isTransientError(error)) return false;
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
    const structuredOptions = {
      ...(streamOptions?.temperature !== undefined ? { temperature: streamOptions.temperature } : {}),
      ...(streamOptions?.timeoutMs !== undefined ? { timeoutMs: streamOptions.timeoutMs } : {}),
      ...(streamOptions?.signal ? { signal: streamOptions.signal } : {}),
      ...(streamOptions?.routing ? { routing: streamOptions.routing } : {}),
    };
    const result = await client.generateStructured<{ reasoning?: unknown; answer?: unknown }>(
      prompt,
      model,
      answerSchema(spec),
      Object.keys(structuredOptions).length > 0 ? structuredOptions : undefined,
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
    if (!shouldFallBackToText(error)) return failed(error);
    // Kept with the answer, so a run shows why it was read as free text.
    const reason = error instanceof Error ? error.message : String(error);
    const fallback = await streamModelResponse(client, prompt, model, streamOptions);
    return fallback.error ? fallback : { ...fallback, answerSource: 'text', structuredFallback: reason };
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
          safeResolve(failed(error, content));
        },
        streamOptions,
      )
      .catch((error: unknown) => {
        safeResolve(failed(error, content));
      });
  });
}

export class EnsembleRunner {
  private readonly requestDelayMs: number;
  private readonly retryOptions: RetryOptions | undefined;
  private readonly streamOptions: StreamResponseOptions | undefined;
  private readonly endpoints: EndpointLocation[];
  private readonly callTimeoutMs: number | undefined;
  private readonly routingFor: EnsembleRunnerOptions['routingFor'];

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly mode: EvalMode,
    options?: EnsembleRunnerOptions,
  ) {
    this.requestDelayMs = Math.max(0, options?.requestDelayMs ?? 0);
    this.retryOptions = options?.retry
      ? { isRetryable: isTransientError, ...options.retry, onRateLimit: options.onRateLimit }
      : options?.onRateLimit
        ? { isRetryable: isTransientError, onRateLimit: options.onRateLimit }
        : undefined;
    const streamOptions: StreamResponseOptions = {
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options?.callTimeoutMs !== undefined ? { timeoutMs: options.callTimeoutMs } : {}),
    };
    this.streamOptions = Object.keys(streamOptions).length > 0 ? streamOptions : undefined;
    this.endpoints = options?.endpoints ?? [];
    this.callTimeoutMs = options?.callTimeoutMs;
    this.routingFor = options?.routingFor;
  }

  async runPrompt(
    prompt: string,
    models: ModelSpec[],
    options: RunPromptOptions = {},
  ): Promise<ProviderResponse[]> {
    const limit = deadlineSignal(options.signal, options.deadline);
    const signal = limit.signal;
    const call = async (client: AIProvider, model: string, streamOptions: StreamResponseOptions | undefined) =>
      emptyAsError(
        options.answer
          ? await structuredModelResponse(client, prompt, model, options.answer, streamOptions)
          : await streamModelResponse(client, prompt, model, streamOptions),
        model,
      );
    const retryOptions: RetryOptions | undefined = this.retryOptions
      ? {
          ...this.retryOptions,
          ...(signal ? { signal } : {}),
          ...(options.deadline !== undefined ? { deadline: options.deadline, attemptMs: this.callTimeoutMs ?? 0 } : {}),
        }
      : undefined;

    const tasks = models.map(async (spec, index) => {
      const { provider, model } = spec;
      // Stagger model requests: model 0 starts immediately, model 1 after requestDelayMs,
      // model 2 after 2*requestDelayMs, etc. All promises are launched concurrently via
      // Promise.all, but each internally sleeps before making the API call.
      // Note: the stagger sleep is intentionally outside the retryable wrapper so that
      // retries do NOT re-apply the initial stagger delay.
      if (this.requestDelayMs > 0 && index > 0) {
        await sleep(index * this.requestDelayMs);
      }

      const routing = this.routingFor?.(spec);
      const streamOptions: StreamResponseOptions | undefined = signal || routing
        ? { ...this.streamOptions, ...(signal ? { signal } : {}), ...(routing ? { routing } : {}) }
        : this.streamOptions;
      const client = this.registry.getProvider(provider, this.mode);
      let attempts = 0;
      const attempt = async () => {
        attempts += 1;
        return call(client, model, streamOptions);
      };
      let result: StreamResult = retryOptions
        ? await retryable(
            async () => {
              const r = await attempt();
              // Throw transient failures so retryable tries again. Others are
              // returned as they are and recorded as failed answers.
              const cause = r.cause ?? (r.error ? new Error(r.error) : undefined);
              if (r.error && (isTransientError(cause) || isRateLimitOrServerError(cause))) throw cause;
              return r;
            },
            retryOptions,
          ).catch((error: unknown): StreamResult => failed(error))
        : await attempt();
      // A call cut off by the question deadline says so, rather than "aborted".
      if (result.error && signal?.aborted && signal.reason instanceof Error) result = failed(signal.reason);

      const { usage: _usage, cause: _cause, ...rest } = result;
      const response = {
        provider,
        model,
        ...rest,
        ...(attempts > 1 ? { attempts } : {}),
        ...priceResponse(provider, model, prompt, result, this.endpoints),
      } satisfies ProviderResponse;
      options.onResponse?.(index, response);
      return response;
    });

    try {
      return await Promise.all(tasks);
    } finally {
      limit.dispose();
    }
  }
}
