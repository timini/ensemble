import type { EvaluationResult, PromptRunResult } from '../types.js';
import { MCQEvaluator, NumericEvaluator } from './evaluators.js';

const numericEvaluator = new NumericEvaluator();
const mcqEvaluator = new MCQEvaluator();

function normalizeModelKey(key: string): string {
  return key.replace(/#\d+$/, '');
}

export function evaluateConsensusAnswer(
  evaluator: 'numeric' | 'mcq' | 'generative' | undefined,
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
    return mcqEvaluator.evaluate(answer, groundTruth);
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

export function responseCostTotals(run: PromptRunResult): {
  tokens: number;
  costUsd: number;
} {
  let tokens = 0;
  let costUsd = 0;
  for (const response of run.responses) {
    if (response.error) {
      continue;
    }
    tokens += response.tokenCount ?? 0;
    costUsd += response.estimatedCostUsd ?? 0;
  }
  return { tokens, costUsd };
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
