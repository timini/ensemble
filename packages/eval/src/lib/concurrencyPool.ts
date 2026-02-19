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
export interface LimiterStats {
  /** Current concurrency limit (AIMD-adjusted). */
  concurrencyLimit: number;
  /** Number of tasks currently executing. */
  running: number;
  /** Number of tasks waiting in queue. */
  queued: number;
  /** Total tasks completed since creation. */
  completed: number;
  /** Total 429 rate-limit events since creation. */
  rateLimits: number;
  /** Tasks completed per second (rolling window). */
  throughput: number;
}

export class ConcurrencyLimiter {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private readonly min: number;
  private readonly max: number;
  private lastAdjustTime: number;
  private readonly cooldownMs: number;
  private readonly monitor: SystemMonitor | null;

  /** Total completed tasks since creation. */
  private completedCount = 0;
  /** Total 429 rate-limit events since creation. */
  private rateLimitCount = 0;
  /** Timestamp when the limiter was created. */
  private readonly createdAt: number;
  /** Completed count at the last stats snapshot (for throughput calculation). */
  private lastSnapshotCompleted = 0;
  /** Timestamp of the last stats snapshot. */
  private lastSnapshotTime: number;
  /** Periodic stats reporter timer (if enabled). */
  private statsTimer: ReturnType<typeof setInterval> | null = null;

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
    this.createdAt = Date.now();
    this.lastSnapshotTime = Date.now();
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

  /** Get a snapshot of current limiter statistics. */
  getStats(): LimiterStats {
    const now = Date.now();
    const totalElapsed = (now - this.createdAt) / 1000;
    const throughput = totalElapsed > 0 ? this.completedCount / totalElapsed : 0;
    return {
      concurrencyLimit: this.concurrency,
      running: this.running,
      queued: this.queue.length,
      completed: this.completedCount,
      rateLimits: this.rateLimitCount,
      throughput,
    };
  }

  /** Reset the rolling throughput window (kept for test compatibility). */
  resetThroughputWindow(): void {
    this.lastSnapshotCompleted = this.completedCount;
    this.lastSnapshotTime = Date.now();
  }

  /**
   * Start a periodic stats reporter that logs limiter state to stderr.
   * Suppresses duplicate lines when nothing has changed (no completions,
   * no rate-limit events, same running/queued counts).
   * @param intervalMs - How often to check (default 1s).
   */
  startStatsReporter(intervalMs = 1_000): void {
    this.stopStatsReporter();
    this.resetThroughputWindow();
    let lastDedupKey = '';
    let suppressedCount = 0;
    this.statsTimer = setInterval(() => {
      const s = this.getStats();
      const elapsed = Math.round((Date.now() - this.createdAt) / 1000);
      // Dedup on state that matters (exclude rate since it changes every tick)
      const dedupKey = `${s.concurrencyLimit}:${s.running}:${s.queued}:${s.completed}:${s.rateLimits}`;
      if (dedupKey === lastDedupKey) {
        suppressedCount++;
        return;
      }
      if (suppressedCount > 0) {
        process.stderr.write(`  [limiter] ... ${suppressedCount}s unchanged\n`);
      }
      process.stderr.write(
        `  [limiter ${elapsed}s] limit=${s.concurrencyLimit} running=${s.running} queued=${s.queued} ` +
        `done=${s.completed} rate=${s.throughput.toFixed(2)}/s 429s=${s.rateLimits}\n`,
      );
      lastDedupKey = dedupKey;
      suppressedCount = 0;
    }, intervalMs);
    this.statsTimer.unref();
  }

  /** Stop the periodic stats reporter. */
  stopStatsReporter(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  /** Stop the system monitor and stats reporter. */
  stop(): void {
    this.monitor?.stop();
    this.stopStatsReporter();
  }

  private onSuccess(): void {
    this.completedCount++;
    const now = Date.now();
    if (now - this.lastAdjustTime >= this.cooldownMs) {
      this.concurrency = Math.min(this.max, this.concurrency + 1);
      this.lastAdjustTime = now;
      this.drainQueue();
    }
  }

  private onRateLimit(): void {
    this.rateLimitCount++;
    const now = Date.now();
    if (now - this.lastAdjustTime >= this.cooldownMs) {
      const prev = this.concurrency;
      this.concurrency = Math.max(this.min, Math.floor(this.concurrency * 0.5));
      this.lastAdjustTime = now;
      process.stderr.write(
        `  [limiter] 429 rate limit — concurrency ${prev} → ${this.concurrency}\n`,
      );
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
