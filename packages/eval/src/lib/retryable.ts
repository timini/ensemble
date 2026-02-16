export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  timeoutMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

interface ResolvedRetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxJitterMs: number;
  timeoutMs: number | undefined;
  isRetryable: (error: unknown) => boolean;
  onRetry: ((error: unknown, attempt: number) => void) | undefined;
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

export function isRateLimitOrServerError(error: unknown): boolean {
  const status = getStatusFromError(error);
  if (status !== undefined) {
    return status === 429 || (status >= 500 && status < 600);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('too many requests') ||
      msg.includes('server error') ||
      msg.includes('internal server error') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504')
    );
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

  if (opts.timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true;
    }, opts.timeoutMs);
  }

  try {
    for (let i = 0; i <= opts.maxRetries; i++) {
      if (timedOut) {
        throw new Error(`Retry timed out after ${opts.timeoutMs}ms`);
      }
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;
        if (timedOut) {
          throw new Error(`Retry timed out after ${opts.timeoutMs}ms`);
        }
        if (i === opts.maxRetries || !opts.isRetryable(error)) {
          throw error;
        }
        opts.onRetry?.(error, i + 1);
        const delay = opts.baseDelayMs * Math.pow(2, i) + Math.random() * opts.maxJitterMs;
        await sleep(delay);
        if (timedOut) {
          throw new Error(`Retry timed out after ${opts.timeoutMs}ms`);
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
