import { freemem, totalmem, loadavg, cpus } from 'node:os';
import { isRateLimitOnly } from './retryable.js';

/**
 * Adaptive concurrency limiter using AIMD (Additive Increase, Multiplicative Decrease).
 *
 * Same algorithm that TCP uses for congestion control. On success, slowly ramp up
 * concurrency (+1). On rate-limit (429), quickly back off (halve). A cooldown prevents
 * oscillation.
 *
 * A single instance is shared across all BenchmarkRunners so that total API concurrency
 * is globally bounded.
 *
 * In addition to rate-limit detection, the limiter monitors system resources (memory
 * and CPU load) and backs off when the host is under pressure.
 */
export class ConcurrencyLimiter {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private readonly min: number;
  private readonly max: number;
  private lastAdjustTime: number;
  private readonly cooldownMs: number;
  private readonly memoryThreshold: number;
  private readonly cpuLoadThreshold: number;

  constructor(opts?: {
    initial?: number;
    min?: number;
    max?: number;
    cooldownMs?: number;
    /** Fraction of total memory that triggers back-off (0-1). Default 0.9 (90%). */
    memoryThreshold?: number;
    /** 1-minute load average that triggers back-off. Default: number of CPUs. */
    cpuLoadThreshold?: number;
  }) {
    this.concurrency = opts?.initial ?? 100;
    this.min = opts?.min ?? 5;
    this.max = opts?.max ?? 500;
    this.cooldownMs = opts?.cooldownMs ?? 2000;
    this.lastAdjustTime = Date.now();
    this.memoryThreshold = opts?.memoryThreshold ?? 0.9;
    this.cpuLoadThreshold = opts?.cpuLoadThreshold ?? cpus().length;
  }

  /** Execute fn with adaptive concurrency. Auto-scales based on 429 errors and system load. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isSystemUnderPressure()) {
      this.onRateLimit();
      await new Promise((r) => setTimeout(r, 500));
    }
    await this.acquire();
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (isRateLimitOnly(error)) this.onRateLimit();
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

  /**
   * Checks system memory and CPU load. Returns true if either:
   * - Memory usage exceeds memoryThreshold (default 90%)
   * - 1-minute CPU load average exceeds cpuLoadThreshold (default = num CPUs)
   */
  private isSystemUnderPressure(): boolean {
    const free = freemem();
    const total = totalmem();
    if (total > 0 && (1 - free / total) > this.memoryThreshold) {
      return true;
    }
    const [load1min] = loadavg();
    return load1min > this.cpuLoadThreshold;
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
