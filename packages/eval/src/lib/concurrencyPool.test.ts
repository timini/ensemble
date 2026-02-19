import { describe, expect, it } from 'vitest';
import { ConcurrencyLimiter } from './concurrencyPool.js';
import { isRateLimitOnly } from './retryable.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Disable system pressure detection so tests aren't affected by host load */
const noPressure = { memoryThreshold: 1.0, cpuLoadThreshold: Infinity };

describe('ConcurrencyLimiter', () => {
  it('limits concurrent executions to configured initial value', async () => {
    // Use a long cooldown so AIMD doesn't change the limit during the test
    const limiter = new ConcurrencyLimiter({ initial: 2, cooldownMs: 60_000, ...noPressure });
    let maxConcurrent = 0;
    let current = 0;

    const task = async () => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await sleep(10);
      current--;
    };

    await Promise.all([
      limiter.run(task),
      limiter.run(task),
      limiter.run(task),
      limiter.run(task),
    ]);

    expect(maxConcurrent).toBe(2);
  });

  it('all tasks eventually complete', async () => {
    const limiter = new ConcurrencyLimiter({ initial: 1, cooldownMs: 60_000, ...noPressure });
    const results: number[] = [];

    await Promise.all(
      [1, 2, 3].map((n) =>
        limiter.run(async () => {
          await sleep(5);
          results.push(n);
        }),
      ),
    );

    expect(results).toHaveLength(3);
    expect(results).toContain(1);
    expect(results).toContain(2);
    expect(results).toContain(3);
  });

  it('increases concurrency on success (additive increase)', async () => {
    const limiter = new ConcurrencyLimiter({ initial: 5, cooldownMs: 0, ...noPressure });

    await limiter.run(async () => {});
    expect(limiter.currentConcurrency).toBe(6);

    // Small delay to ensure a new millisecond for the next cooldown check
    await sleep(1);

    await limiter.run(async () => {});
    expect(limiter.currentConcurrency).toBe(7);
  });

  it('halves concurrency on rate limit (multiplicative decrease)', async () => {
    const limiter = new ConcurrencyLimiter({ initial: 100, cooldownMs: 0, ...noPressure });

    try {
      await limiter.run(async () => {
        const error = new Error('429 Too Many Requests');
        (error as unknown as Record<string, unknown>).status = 429;
        throw error;
      });
    } catch {
      // expected
    }

    expect(limiter.currentConcurrency).toBe(50);
  });

  it('respects minimum concurrency bound', async () => {
    const limiter = new ConcurrencyLimiter({
      initial: 6,
      min: 5,
      cooldownMs: 0,
    });

    // Trigger multiple rate limits with small delays to bypass cooldown
    for (let i = 0; i < 5; i++) {
      limiter.notifyRateLimit();
      await sleep(1);
    }

    expect(limiter.currentConcurrency).toBe(5);
  });

  it('respects maximum concurrency bound', async () => {
    const limiter = new ConcurrencyLimiter({
      initial: 499,
      max: 500,
      cooldownMs: 0,
      ...noPressure,
    });

    await limiter.run(async () => {});
    expect(limiter.currentConcurrency).toBe(500);

    await sleep(1);

    await limiter.run(async () => {});
    expect(limiter.currentConcurrency).toBe(500);
  });

  it('cooldown prevents rapid oscillation', async () => {
    const limiter = new ConcurrencyLimiter({
      initial: 100,
      cooldownMs: 5, // short cooldown
    });

    // Wait for cooldown from construction to elapse
    await sleep(10);

    // First rate limit triggers decrease
    limiter.notifyRateLimit();
    expect(limiter.currentConcurrency).toBe(50);

    // Immediate second rate limit — cooldown not elapsed, should NOT decrease again
    limiter.notifyRateLimit();
    expect(limiter.currentConcurrency).toBe(50);
  });

  it('notifyRateLimit signals from external callers', () => {
    const limiter = new ConcurrencyLimiter({ initial: 100, cooldownMs: 0 });

    limiter.notifyRateLimit();
    expect(limiter.currentConcurrency).toBe(50);
  });

  it('reports currentRunning accurately', async () => {
    const limiter = new ConcurrencyLimiter({ initial: 10, cooldownMs: 60_000, ...noPressure });
    expect(limiter.currentRunning).toBe(0);

    let observedRunning = 0;
    const promise = limiter.run(async () => {
      observedRunning = limiter.currentRunning;
      await sleep(5);
    });

    // Small delay to let the task start
    await sleep(1);
    expect(observedRunning).toBe(1);

    await promise;
    expect(limiter.currentRunning).toBe(0);
  });

  it('propagates errors from the wrapped function', async () => {
    const limiter = new ConcurrencyLimiter({ initial: 10, cooldownMs: 0, ...noPressure });

    await expect(
      limiter.run(async () => {
        throw new Error('test error');
      }),
    ).rejects.toThrow('test error');
  });

  it('shared instance across multiple callers gates total concurrency', async () => {
    // Use a long cooldown so AIMD doesn't change the limit during the test
    const limiter = new ConcurrencyLimiter({ initial: 3, cooldownMs: 60_000, ...noPressure });
    let maxConcurrent = 0;
    let current = 0;

    const task = async () => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await sleep(10);
      current--;
    };

    // Simulate two "callers" sharing the same limiter
    const callerA = Promise.all([limiter.run(task), limiter.run(task), limiter.run(task)]);
    const callerB = Promise.all([limiter.run(task), limiter.run(task), limiter.run(task)]);

    await Promise.all([callerA, callerB]);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});

describe('isRateLimitOnly', () => {
  it('detects errors with status 429', () => {
    const error = new Error('Rate limited');
    (error as unknown as Record<string, unknown>).status = 429;
    expect(isRateLimitOnly(error)).toBe(true);
  });

  it('detects errors with statusCode 429', () => {
    const error = new Error('Rate limited');
    (error as unknown as Record<string, unknown>).statusCode = 429;
    expect(isRateLimitOnly(error)).toBe(true);
  });

  it('detects errors mentioning 429 in message', () => {
    expect(isRateLimitOnly(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('detects errors mentioning rate limit in message', () => {
    expect(isRateLimitOnly(new Error('Rate limit exceeded'))).toBe(true);
  });

  it('returns false for non-rate-limit errors', () => {
    expect(isRateLimitOnly(new Error('Internal server error'))).toBe(false);
    expect(isRateLimitOnly(null)).toBe(false);
    expect(isRateLimitOnly(undefined)).toBe(false);
  });

  it('detects "too many requests" message', () => {
    expect(isRateLimitOnly(new Error('Too many requests'))).toBe(true);
  });
});
