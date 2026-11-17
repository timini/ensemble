export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  timeoutMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
  /** Called when a rate-limit error is detected, even before the internal retry. */
  onRateLimit?: () => void;
  /** Upper bound for one wait between attempts, Retry-After included. Default 60 s. */
  maxDelayMs?: number;
  /** Stops retrying once aborted (the question ran out of time). */
  signal?: AbortSignal;
}

interface ResolvedRetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxJitterMs: number;
  timeoutMs: number | undefined;
  isRetryable: (error: unknown) => boolean;
  onRetry: ((error: unknown, attempt: number) => void) | undefined;
  onRateLimit: (() => void) | undefined;
  maxDelayMs: number;
  signal: AbortSignal | undefined;
}

function getStatusFromError(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object') {
    return undefined;
  }
  const record = error as Record<string, unknown>;
  if (typeof record.status === 'number') {
    return record.status;
  }
  if (typeof record.statusCode === 'number') {
    return record.statusCode;
  }
  if (record.response && typeof record.response === 'object') {
    const resp = record.response as Record<string, unknown>;
    if (typeof resp.status === 'number') {
      return resp.status;
    }
  }
  return undefined;
}

const RETRYABLE_MESSAGE_PATTERN =
  /rate limit|too many requests|\b429\b|server error|internal server error|\b502\b|\b503\b|\b504\b|failed to parse stream|high demand/i;

export function isRateLimitOrServerError(error: unknown): boolean {
  const status = getStatusFromError(error);
  if (status !== undefined) {
    return status === 429 || (status >= 500 && status < 600);
  }
  if (error instanceof Error) {
    return RETRYABLE_MESSAGE_PATTERN.test(error.message);
  }
  return false;
}

const RATE_LIMIT_ONLY_PATTERN = /rate.?limit|too many requests|\b429\b/i;

/** Returns true only for 429/rate-limit errors (not 5xx server errors). */
export function isRateLimitOnly(error: unknown): boolean {
  const status = getStatusFromError(error);
  if (status !== undefined) {
    return status === 429;
  }
  if (error instanceof Error) {
    return RATE_LIMIT_ONLY_PATTERN.test(error.message);
  }
  return false;
}

function resolveOptions(options?: RetryOptions): ResolvedRetryOptions {
  return {
    maxRetries: options?.maxRetries ?? 4,
    baseDelayMs: options?.baseDelayMs ?? 2000,
    maxJitterMs: options?.maxJitterMs ?? 500,
    timeoutMs: options?.timeoutMs,
    isRetryable: options?.isRetryable ?? isRateLimitOrServerError,
    onRetry: options?.onRetry,
    onRateLimit: options?.onRateLimit,
    maxDelayMs: options?.maxDelayMs ?? 60_000,
    signal: options?.signal,
  };
}

const TRANSIENT_KINDS = new Set(['rate_limited', 'provider_unavailable', 'timeout']);

const TRANSIENT_MESSAGE_PATTERN =
  /fetch failed|failed to fetch|econnreset|econnrefused|etimedout|enotfound|eai_again|epipe|socket hang up|und_err|network error|terminated|other side closed|empty response|overloaded|provider_unavailable|timed? ?out|timeout/i;

/** True when the call was cancelled on purpose (question timeout), which is never retried. */
function isAbort(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  const message = error instanceof Error ? error.message : String(error);
  return /was aborted/i.test(message);
}

/**
 * True for failures worth another attempt: 429 and 5xx, network errors
 * (fetch failed, ECONNRESET and similar), per-call timeouts and empty
 * completions. Key errors, bad requests and deliberate aborts are not.
 */
export function isTransientError(error: unknown): boolean {
  if (error == null) return false;
  if (isAbort(error)) return false;
  const kind = (error as { kind?: unknown }).kind;
  if (typeof kind === 'string' && TRANSIENT_KINDS.has(kind)) return true;
  if (isRateLimitOrServerError(error)) return true;
  const status = getStatusFromError(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? ` ${error.cause.message} ${(error.cause as { code?: unknown }).code ?? ''}` : '';
  return TRANSIENT_MESSAGE_PATTERN.test(`${message}${cause}`);
}

/** Delay the server asked for (Retry-After), in ms, if the error carries one. */
export function retryAfterMsOf(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object') return undefined;
  const seconds = (error as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return undefined;
}

/**
 * Wait before attempt `attempt + 1`: exponential backoff with jitter, or the
 * server's Retry-After when that is longer, capped at maxDelayMs.
 */
export function backoffDelayMs(
  attempt: number,
  options: Pick<RetryOptions, 'baseDelayMs' | 'maxJitterMs' | 'maxDelayMs'>,
  error?: unknown,
  random: () => number = Math.random,
): number {
  const base = (options.baseDelayMs ?? 2000) * Math.pow(2, attempt) + random() * (options.maxJitterMs ?? 500);
  const delay = Math.max(base, retryAfterMsOf(error) ?? 0);
  return Math.min(delay, options.maxDelayMs ?? 60_000);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function retryable<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = resolveOptions(options);
  let lastError: unknown;
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const buildTimeoutError = () => {
    let message = `Retry timed out after ${opts.timeoutMs}ms`;
    if (lastError) {
      const detail = lastError instanceof Error ? lastError.message : String(lastError);
      message += `. Last error: ${detail}`;
    }
    return new Error(message);
  };

  if (opts.timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true;
    }, opts.timeoutMs);
  }

  try {
    for (let i = 0; i <= opts.maxRetries; i++) {
      if (timedOut) {
        throw buildTimeoutError();
      }
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;
        if (timedOut) {
          throw buildTimeoutError();
        }
        if (i === opts.maxRetries || opts.signal?.aborted || !opts.isRetryable(error)) {
          throw error;
        }
        if (isRateLimitOnly(error)) {
          opts.onRateLimit?.();
        }
        opts.onRetry?.(error, i + 1);
        await sleep(backoffDelayMs(i, opts, error), opts.signal);
        if (timedOut) {
          throw buildTimeoutError();
        }
        if (opts.signal?.aborted) {
          throw error;
        }
      }
    }
    throw lastError;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}
