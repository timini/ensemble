import { describe, expect, it, vi } from 'vitest';
import { isRateLimitOrServerError, retryable } from './retryable.js';

describe('isRateLimitOrServerError', () => {
  it('detects 429 via status property', () => {
    expect(isRateLimitOrServerError({ status: 429 })).toBe(true);
  });

  it('detects 429 via statusCode property', () => {
    expect(isRateLimitOrServerError({ statusCode: 429 })).toBe(true);
  });

  it('detects 500 via response.status', () => {
    expect(isRateLimitOrServerError({ response: { status: 500 } })).toBe(true);
  });

  it('detects 503 via status', () => {
    expect(isRateLimitOrServerError({ status: 503 })).toBe(true);
  });

  it('returns false for 400 (client error)', () => {
    expect(isRateLimitOrServerError({ status: 400 })).toBe(false);
  });

  it('returns false for 401 (auth error)', () => {
    expect(isRateLimitOrServerError({ status: 401 })).toBe(false);
  });

  it('detects rate limit from error message', () => {
    expect(isRateLimitOrServerError(new Error('Rate limit exceeded'))).toBe(true);
  });

  it('detects 429 from error message', () => {
    expect(isRateLimitOrServerError(new Error('HTTP 429 Too Many Requests'))).toBe(true);
  });

  it('returns false for non-retryable error message', () => {
    expect(isRateLimitOrServerError(new Error('Invalid API key'))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isRateLimitOrServerError(null)).toBe(false);
    expect(isRateLimitOrServerError(undefined)).toBe(false);
  });
});

describe('retryable', () => {
  it('succeeds on first attempt without retry', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryable(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds on Nth attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockResolvedValue('success');

    const result = await retryable(fn, { baseDelayMs: 1, maxJitterMs: 0 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'));

    await expect(retryable(fn, { baseDelayMs: 1, maxJitterMs: 0 })).rejects.toThrow(
      'Invalid API key',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exhausts all retries and throws last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'));

    await expect(
      retryable(fn, { maxRetries: 2, baseDelayMs: 1, maxJitterMs: 0 }),
    ).rejects.toThrow('Rate limit exceeded');

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('timeout causes retry loop to abort', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'));

    await expect(
      retryable(fn, {
        maxRetries: 10,
        baseDelayMs: 50,
        maxJitterMs: 0,
        timeoutMs: 30,
      }),
    ).rejects.toThrow('Retry timed out after 30ms');

    // Should have attempted fewer than maxRetries due to timeout
    expect(fn.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('uses custom isRetryable predicate', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('custom retryable'))
      .mockResolvedValue('done');

    const result = await retryable(fn, {
      baseDelayMs: 1,
      maxJitterMs: 0,
      isRetryable: (err) => err instanceof Error && err.message.includes('custom retryable'),
    });

    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('invokes onRetry callback with correct arguments', async () => {
    const onRetry = vi.fn();
    const error1 = new Error('Rate limit exceeded');
    const error2 = new Error('Rate limit exceeded');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2)
      .mockResolvedValue('ok');

    await retryable(fn, {
      baseDelayMs: 1,
      maxJitterMs: 0,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, error1, 1);
    expect(onRetry).toHaveBeenNthCalledWith(2, error2, 2);
  });
});
