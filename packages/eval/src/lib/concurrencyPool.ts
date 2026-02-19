/**
 * Adaptive concurrency limiter using AIMD (Additive Increase, Multiplicative Decrease).
 *
 * Same algorithm that TCP uses for congestion control. On success, slowly ramp up
 * concurrency (+1). On rate-limit (429), quickly back off (halve). A cooldown prevents
 * oscillation.
 *
 * A single instance is shared across all BenchmarkRunners so that total API concurrency
 * is globally bounded.
 */
export class ConcurrencyLimiter {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private readonly min: number;
  private readonly max: number;
  private lastAdjustTime: number;
  private readonly cooldownMs: number;

  constructor(opts?: {
    initial?: number;
    min?: number;
    max?: number;
    cooldownMs?: number;
  }) {
    this.concurrency = opts?.initial ?? 100;
    this.min = opts?.min ?? 5;
    this.max = opts?.max ?? 500;
    this.cooldownMs = opts?.cooldownMs ?? 2000;
    this.lastAdjustTime = Date.now();
  }

  /** Execute fn with adaptive concurrency. Auto-scales based on 429 errors. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (isRateLimitError(error)) this.onRateLimit();
      throw error;
    } finally {
      this.release();
    }
  }

  /** Called externally when a 429 is observed (even if retried internally). */
  notifyRateLimit(): void {
    this.onRateLimit();
  }

  get currentConcurrency(): number {
    return this.concurrency;
  }

  get currentRunning(): number {
    return this.running;
  }

  private onSuccess(): void {
    const now = Date.now();
    if (now - this.lastAdjustTime >= this.cooldownMs) {
      this.concurrency = Math.min(this.max, this.concurrency + 1);
      this.lastAdjustTime = now;
      this.drainQueue();
    }
  }

  private onRateLimit(): void {
    const now = Date.now();
    if (now - this.lastAdjustTime >= this.cooldownMs) {
      this.concurrency = Math.max(this.min, Math.floor(this.concurrency * 0.5));
      this.lastAdjustTime = now;
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  private release(): void {
    this.running--;
    this.drainQueue();
  }

  private drainQueue(): void {
    while (this.queue.length > 0 && this.running < this.concurrency) {
      const next = this.queue.shift()!;
      next();
    }
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;

  if (typeof record.status === 'number' && record.status === 429) return true;
  if (typeof record.statusCode === 'number' && record.statusCode === 429) return true;

  if (error instanceof Error) {
    return /\b429\b|rate.?limit|too many requests/i.test(error.message);
  }
  return false;
}
