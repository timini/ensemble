import si from 'systeminformation';
import { isRateLimitOnly } from './retryable.js';

export interface SystemPressureState {
  memoryUsage: number;  // fraction 0-1
  cpuLoad: number;      // percentage 0-100
  networkTxSec: number; // bytes/sec transmit
  underPressure: boolean;
}

/**
 * Monitors system resources (memory, CPU, network) via the systeminformation package.
 * Samples periodically and caches the latest state so checks are synchronous.
 */
export class SystemMonitor {
  private state: SystemPressureState = {
    memoryUsage: 0, cpuLoad: 0, networkTxSec: 0, underPressure: false,
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly memoryThreshold: number;
  private readonly cpuLoadThreshold: number;
  private readonly networkTxThreshold: number;

  constructor(opts?: {
    /** Memory usage fraction (0-1) that triggers pressure. Default 0.9 (90%). */
    memoryThreshold?: number;
    /** CPU load percentage (0-100) that triggers pressure. Default 90. */
    cpuLoadThreshold?: number;
    /** Network TX bytes/sec that triggers pressure. Default Infinity (disabled). */
    networkTxThreshold?: number;
    /** Sampling interval in ms. Default 3000 (3s). */
    intervalMs?: number;
  }) {
    this.memoryThreshold = opts?.memoryThreshold ?? 0.9;
    this.cpuLoadThreshold = opts?.cpuLoadThreshold ?? 90;
    this.networkTxThreshold = opts?.networkTxThreshold ?? Infinity;
    const intervalMs = opts?.intervalMs ?? 3000;
    this.timer = setInterval(() => { void this.sample(); }, intervalMs);
    this.timer.unref(); // Don't keep process alive
  }

  /** Get the latest cached system pressure state. */
  get current(): SystemPressureState {
    return this.state;
  }

  /** Returns true if any resource exceeds its threshold. */
  get isUnderPressure(): boolean {
    return this.state.underPressure;
  }

  /** Stop the background sampling timer. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sample(): Promise<void> {
    try {
      const [memData, loadData, netData] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.networkStats(),
      ]);

      const memoryUsage = memData.total > 0
        ? 1 - (memData.available / memData.total)
        : 0;
      const cpuLoad = loadData.currentLoad;
      const networkTxSec = Array.isArray(netData)
        ? netData.reduce((sum, n) => sum + (n.tx_sec ?? 0), 0)
        : (netData as { tx_sec?: number }).tx_sec ?? 0;

      const underPressure =
        memoryUsage > this.memoryThreshold ||
        cpuLoad > this.cpuLoadThreshold ||
        networkTxSec > this.networkTxThreshold;

      this.state = { memoryUsage, cpuLoad, networkTxSec, underPressure };
    } catch {
      // Sampling failure is non-fatal; keep the previous state
    }
  }
}

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
 * Optionally integrates with a SystemMonitor to back off when the host is under
 * resource pressure (memory, CPU, or network).
 */
export class ConcurrencyLimiter {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private readonly min: number;
  private readonly max: number;
  private lastAdjustTime: number;
  private readonly cooldownMs: number;
  private readonly monitor: SystemMonitor | null;

  constructor(opts?: {
    initial?: number;
    min?: number;
    max?: number;
    cooldownMs?: number;
    /** SystemMonitor instance for resource-based back-off. */
    monitor?: SystemMonitor;
  }) {
    this.concurrency = opts?.initial ?? 100;
    this.min = opts?.min ?? 5;
    this.max = opts?.max ?? 500;
    this.cooldownMs = opts?.cooldownMs ?? 2000;
    this.lastAdjustTime = Date.now();
    this.monitor = opts?.monitor ?? null;
  }

  /** Execute fn with adaptive concurrency. Auto-scales based on 429 errors and system load. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.monitor?.isUnderPressure) {
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

  /** Stop the system monitor if one was provided. */
  stop(): void {
    this.monitor?.stop();
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
