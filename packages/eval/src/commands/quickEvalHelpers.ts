import type { PromptRunResult, StrategyName } from '../types.js';

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

export function computeAccuracy(runs: PromptRunResult[], strategy?: StrategyName): {
  correct: number;
  total: number;
  accuracy: number;
} {
  let correct = 0;
  let total = 0;
  if (strategy) {
    for (const run of runs) {
      const result = run.consensusEvaluation?.results?.[strategy];
      if (result) {
        total += 1;
        if (result.correct) correct += 1;
      }
    }
  } else {
    for (const run of runs) {
      if (!run.evaluation?.results) continue;
      for (const result of Object.values(run.evaluation.results)) {
        total += 1;
        if (result.correct) correct += 1;
      }
    }
  }
  return { correct, total, accuracy: total > 0 ? correct / total : 0 };
}
