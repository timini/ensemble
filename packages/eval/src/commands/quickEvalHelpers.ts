import type { ConsensusStrategyMetrics, EvaluationResult, PromptRunResult, StrategyName } from '../types.js';

export function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function toDelta(value: number): string {
  const pct = (value * 100).toFixed(1);
  if (value > 0) return `+${pct}%`;
  return `${pct}%`;
}

export function sumTokens(runs: PromptRunResult[]): number {
  let total = 0;
  for (const run of runs) {
    for (const r of run.responses) {
      if (!r.error) total += r.tokenCount ?? 0;
    }
  }
  return total;
}

/** Successful responses with no price, which sumCost leaves out. */
export function countUnpriced(runs: PromptRunResult[]): number {
  let count = 0;
  for (const run of runs) {
    for (const r of run.responses) {
      if (!r.error && r.estimatedCostUsd === undefined) count += 1;
    }
  }
  return count;
}

export function sumCost(runs: PromptRunResult[]): number {
  let total = 0;
  for (const run of runs) {
    for (const r of run.responses) {
      if (!r.error) total += r.estimatedCostUsd ?? 0;
    }
  }
  return total;
}

export function avgDurationMs(runs: PromptRunResult[]): number {
  const durations = runs.map((r) => r.durationMs ?? 0).filter((d) => d > 0);
  if (durations.length === 0) return 0;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export interface StrategyMetricsTotal extends ConsensusStrategyMetrics {
  costUsd: number;
  /** Questions whose consensus calls had no price, which costUsd leaves out. */
  unpriced: number;
}

/** Sum per-strategy consensus metrics across runs. */
export function sumStrategyMetrics(
  runs: PromptRunResult[],
  strategy: StrategyName,
): StrategyMetricsTotal {
  let tokenCount = 0;
  let durationSum = 0;
  let costUsd = 0;
  let unpriced = 0;
  let count = 0;
  for (const run of runs) {
    const m = run.consensusMetrics?.[strategy];
    if (m) {
      tokenCount += m.tokenCount;
      durationSum += m.durationMs;
      if (m.costUsd === undefined) unpriced += 1;
      else costUsd += m.costUsd;
      count += 1;
    }
  }
  return { tokenCount, durationMs: count > 0 ? durationSum / count : 0, costUsd, unpriced };
}

export interface AccuracyCount {
  correct: number;
  total: number;
  accuracy: number;
  /** Answers missing because the call failed. Counted in total as wrong. */
  errors: number;
  /** Answers missing because the call timed out. Counted in total as wrong. */
  timeouts: number;
}

/**
 * Accuracy over all answers, with failed and timed-out answers counted as
 * wrong (they are in `total`) and also reported on their own.
 */
export function computeAccuracy(runs: PromptRunResult[], strategy?: StrategyName): AccuracyCount {
  let correct = 0;
  let total = 0;
  let errors = 0;
  let timeouts = 0;
  const count = (result: EvaluationResult) => {
    total += 1;
    if (result.correct) correct += 1;
    if (result.failure === 'error') errors += 1;
    if (result.failure === 'timeout') timeouts += 1;
  };
  for (const run of runs) {
    if (strategy) {
      const result = run.consensusEvaluation?.results?.[strategy];
      if (result) count(result);
    } else {
      for (const result of Object.values(run.evaluation?.results ?? {})) count(result);
    }
  }
  return { correct, total, accuracy: total > 0 ? correct / total : 0, errors, timeouts };
}
