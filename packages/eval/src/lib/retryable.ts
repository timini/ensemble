export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  timeoutMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
  /** Called when a rate-limit error is detected, even before the internal retry. */
  onRateLimit?: () => void;
}

interface ResolvedRetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxJitterMs: number;
  timeoutMs: number | undefined;
  isRetryable: (error: unknown) => boolean;
  onRetry: ((error: unknown, attempt: number) => void) | undefined;
  onRateLimit: (() => void) | undefined;
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
  /rate limit|too many requests|\b429\b|server error|internal server error|\b502\b|\b503\b|\b504\b/i;

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

function resolveOptions(options?: RetryOptions): ResolvedRetryOptions {
  return {
    maxRetries: options?.maxRetries ?? 4,
    baseDelayMs: options?.baseDelayMs ?? 2000,
    maxJitterMs: options?.maxJitterMs ?? 500,
    timeoutMs: options?.timeoutMs,
    isRetryable: options?.isRetryable ?? isRateLimitOrServerError,
    onRetry: options?.onRetry,
    onRateLimit: options?.onRateLimit,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        if (i === opts.maxRetries || !opts.isRetryable(error)) {
          throw error;
        }
        opts.onRateLimit?.();
        opts.onRetry?.(error, i + 1);
        const delay = opts.baseDelayMs * Math.pow(2, i) + Math.random() * opts.maxJitterMs;
        await sleep(delay);
        if (timedOut) {
          throw buildTimeoutError();
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
