import type { EvaluationResult, PromptRunResult } from '../types.js';
import { NumericEvaluator } from './evaluators.js';
import { extractChoiceLetter } from './parsers.js';

const numericEvaluator = new NumericEvaluator();

function normalizeModelKey(key: string): string {
  return key.replace(/#\d+$/, '');
}

export function evaluateConsensusAnswer(
  evaluator: 'numeric' | 'mcq' | 'generative' | 'exact-match' | undefined,
  answer: string,
  groundTruth: string,
): EvaluationResult | null {
  if (!answer || !groundTruth) {
    return null;
  }

  if (evaluator === 'numeric') {
    return numericEvaluator.evaluate(answer, groundTruth);
  }
  if (evaluator === 'mcq') {
    const expected = (extractChoiceLetter(groundTruth) ?? groundTruth.trim()).toUpperCase();
    const predicted = extractChoiceLetter(answer);
    return {
      correct: predicted !== null && expected.length > 0 ? predicted === expected : false,
      expected,
      predicted,
    };
  }
  if (evaluator === 'exact-match') {
    const predicted = answer.trim();
    const expected = groundTruth.trim();
    return {
      correct: predicted.toLowerCase() === expected.toLowerCase(),
      expected,
      predicted,
    };
  }
  return null;
}

export function collectModelResults(run: PromptRunResult): Record<string, EvaluationResult> {
  if (!run.evaluation) {
    return {};
  }

  const firstByModel = new Map<string, EvaluationResult>();
  for (const [rawKey, result] of Object.entries(run.evaluation.results)) {
    const modelKey = normalizeModelKey(rawKey);
    if (!firstByModel.has(modelKey)) {
      firstByModel.set(modelKey, result);
    }
  }

  return Object.fromEntries(firstByModel.entries());
}

/**
 * A cost total as text. When any call in it had no price the total is a
 * lower bound, or unknown when nothing was priced, so an unpriced model is
 * never shown as free.
 */
export function formatCostUsd(costUsd: number, unpricedCalls: number): string {
  const amount = `$${costUsd.toFixed(4)}`;
  if (unpricedCalls === 0) return amount;
  const note = `${unpricedCalls} unpriced call${unpricedCalls === 1 ? '' : 's'}`;
  return costUsd > 0 ? `>= ${amount} (${note})` : `unknown (${note})`;
}

export function responseCostTotals(run: PromptRunResult): {
  tokens: number;
  costUsd: number;
  /** Successful responses with no price. */
  unpriced: number;
} {
  let tokens = 0;
  let costUsd = 0;
  let unpriced = 0;
  for (const response of run.responses) {
    if (response.error) {
      continue;
    }
    tokens += response.tokenCount ?? 0;
    if (response.estimatedCostUsd === undefined) unpriced += 1;
    else costUsd += response.estimatedCostUsd;
  }
  return { tokens, costUsd, unpriced };
}

export function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function pickPrimaryStrategy(runs: PromptRunResult[]): string | null {
  const seen = new Set<string>();
  for (const run of runs) {
    for (const strategy of Object.keys(run.consensus)) {
      seen.add(strategy);
    }
  }

  if (seen.has('standard')) {
    return 'standard';
  }
  if (seen.has('majority')) {
    return 'majority';
  }
  if (seen.has('elo')) {
    return 'elo';
  }
  const first = [...seen][0];
  return first ?? null;
}
