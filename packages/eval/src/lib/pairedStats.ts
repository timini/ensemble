/**
 * Paired comparison of two scorers on the same questions: Wilson intervals
 * for each accuracy and a McNemar test on the discordant pairs. Used by
 * every report (quick-eval output and `analyze`).
 */
import type { PromptRunResult, StrategyName } from '../types.js';
import { computeMcNemar, type BinaryPair } from './statistics.js';
import { wilsonScoreInterval } from './wilsonScore.js';

/** Below this many discordant pairs the exact binomial test is used. */
const EXACT_BELOW = 25;

export interface AccuracyWithInterval {
  correct: number;
  total: number;
  accuracy: number;
  /** 95% Wilson interval. */
  lower: number;
  upper: number;
}

export interface PairedComparison {
  n: number;
  /** The first of each pair (`modelCorrect`): the single model. */
  baseline: AccuracyWithInterval;
  /** The second of each pair (`strategyCorrect`): the ensemble strategy. */
  candidate: AccuracyWithInterval;
  /** Baseline right, candidate wrong. */
  n10: number;
  /** Baseline wrong, candidate right. */
  n01: number;
  pValue: number;
  method: 'exact' | 'chi-squared';
}

function logChoose(n: number, k: number): number {
  let sum = 0;
  for (let i = 1; i <= k; i += 1) sum += Math.log(n - k + i) - Math.log(i);
  return sum;
}

/** Two-sided exact McNemar p-value: a binomial test on the discordant pairs with p = 0.5. */
export function exactMcNemarPValue(n10: number, n01: number): number {
  const n = n10 + n01;
  if (n === 0) return 1;
  const k = Math.min(n10, n01);
  let tail = 0;
  for (let i = 0; i <= k; i += 1) tail += Math.exp(logChoose(n, i) - n * Math.LN2);
  return Math.min(1, 2 * tail);
}

export function withInterval(correct: number, total: number): AccuracyWithInterval {
  const ci = wilsonScoreInterval(correct, total);
  return { correct, total, accuracy: total > 0 ? correct / total : 0, lower: ci.lower, upper: ci.upper };
}

/** Compare two scorers on paired outcomes. */
export function comparePaired(pairs: BinaryPair[]): PairedComparison {
  const mc = computeMcNemar(pairs);
  const discordant = mc.n10 + mc.n01;
  const method = discordant < EXACT_BELOW ? 'exact' : 'chi-squared';
  return {
    n: pairs.length,
    baseline: withInterval(mc.n11 + mc.n10, pairs.length),
    candidate: withInterval(mc.n11 + mc.n01, pairs.length),
    n10: mc.n10,
    n01: mc.n01,
    pValue: method === 'exact' ? exactMcNemarPValue(mc.n10, mc.n01) : mc.pValue,
    method,
  };
}

function firstResult(run: PromptRunResult): boolean | undefined {
  const results = run.evaluation?.results;
  if (!results) return undefined;
  const first = Object.values(results)[0];
  return first?.correct;
}

/**
 * Pair single-model runs with an ensemble strategy by question id. Questions
 * missing on either side are left out (failed questions are recorded as
 * wrong, so they are not missing).
 */
export function pairSingleWithStrategy(
  singleRuns: PromptRunResult[],
  ensembleRuns: PromptRunResult[],
  strategy: StrategyName,
): BinaryPair[] {
  const single = new Map<string, boolean>();
  for (const run of singleRuns) {
    const correct = firstResult(run);
    if (run.questionId && correct !== undefined) single.set(run.questionId, correct);
  }
  const pairs: BinaryPair[] = [];
  for (const run of orderBy(singleRuns, ensembleRuns)) {
    const strategyResult = run.consensusEvaluation?.results?.[strategy];
    const modelCorrect = run.questionId ? single.get(run.questionId) : undefined;
    if (strategyResult && modelCorrect !== undefined) {
      pairs.push({ modelCorrect, strategyCorrect: strategyResult.correct });
    }
  }
  return pairs;
}

/** Ensemble runs in the order of the single runs, so pairs come out in question order. */
function orderBy(singleRuns: PromptRunResult[], ensembleRuns: PromptRunResult[]): PromptRunResult[] {
  const byId = new Map(ensembleRuns.map((run) => [run.questionId, run]));
  return singleRuns.map((run) => byId.get(run.questionId)).filter((run): run is PromptRunResult => Boolean(run));
}

/** "[51.2, 64.6]": a 95% interval in percent. */
export function formatInterval(ci: { lower: number; upper: number }): string {
  return `[${(ci.lower * 100).toFixed(1)}, ${(ci.upper * 100).toFixed(1)}]`;
}

/** p-value for display. */
export function formatPValue(p: number): string {
  return p < 0.001 ? '<0.001' : p.toFixed(3);
}
