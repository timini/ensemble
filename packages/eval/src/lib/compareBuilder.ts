import { fisherExact } from './fisherExact.js';
import type {
  BrokenQuestion,
  RegressionResult,
  StrategyRegressionResult,
} from './regressionTypes.js';
import type {
  BenchmarkDatasetName,
  EvaluationResult,
  PromptRunResult,
  StrategyName,
} from '../types.js';

/** Minimum shape required from a results JSON file. */
export interface ResultFileWithRuns {
  dataset?: string;
  strategies?: StrategyName[];
  runs: PromptRunResult[];
}

/** Options controlling the comparison thresholds. */
export interface ComparisonOptions {
  /** p-value significance threshold. */
  threshold: number;
}

/**
 * Collect the set of distinct strategies present across all runs.
 * Falls back to top-level `strategies` if per-run data is unavailable.
 */
function collectStrategies(file: ResultFileWithRuns): StrategyName[] {
  const strategies = new Set<StrategyName>();
  if (file.strategies) {
    for (const s of file.strategies) strategies.add(s);
  }
  for (const run of file.runs) {
    if (run.consensusEvaluation) {
      for (const key of Object.keys(run.consensusEvaluation.results)) {
        strategies.add(key as StrategyName);
      }
    }
  }
  return [...strategies];
}

/**
 * Look up the consensus evaluation result for a given strategy in a run.
 * Returns `undefined` if the run does not have consensus evaluation data for that strategy.
 */
function getConsensusResult(
  run: PromptRunResult,
  strategy: StrategyName,
): EvaluationResult | undefined {
  return run.consensusEvaluation?.results[strategy];
}

/**
 * Build a mapping from questionId to PromptRunResult for quick lookup.
 */
function indexByQuestionId(runs: PromptRunResult[]): Map<string, PromptRunResult> {
  const map = new Map<string, PromptRunResult>();
  for (const run of runs) {
    if (run.questionId) {
      map.set(run.questionId, run);
    }
  }
  return map;
}

/**
 * Build the RegressionResult by comparing two result files.
 *
 * @param baseline - The baseline benchmark results to compare against.
 * @param current - The current benchmark results being evaluated.
 * @param options - Comparison options including the significance threshold.
 * @returns A complete RegressionResult summarising the comparison.
 * @throws When no matching question IDs exist between the two files.
 */
export function buildComparisonResult(
  baseline: ResultFileWithRuns,
  current: ResultFileWithRuns,
  options: ComparisonOptions,
): RegressionResult {
  const baselineIndex = indexByQuestionId(baseline.runs);
  const currentIndex = indexByQuestionId(current.runs);

  // Find matching question IDs
  const matchingIds: string[] = [];
  for (const id of baselineIndex.keys()) {
    if (currentIndex.has(id)) {
      matchingIds.push(id);
    }
  }

  if (matchingIds.length === 0) {
    throw new Error(
      'No matching question IDs found between baseline and current results. ' +
        'Ensure both files contain runs with overlapping questionId values.',
    );
  }

  // Collect all strategies from both files
  const allStrategies = new Set<StrategyName>();
  for (const s of collectStrategies(baseline)) allStrategies.add(s);
  for (const s of collectStrategies(current)) allStrategies.add(s);

  const dataset = (baseline.dataset ?? 'unknown') as BenchmarkDatasetName;
  const perStrategy: StrategyRegressionResult[] = [];
  const brokenQuestions: BrokenQuestion[] = [];

  for (const strategy of allStrategies) {
    let baselineCorrect = 0;
    let baselineWrong = 0;
    let currentCorrect = 0;
    let currentWrong = 0;

    for (const qId of matchingIds) {
      const baselineRun = baselineIndex.get(qId)!;
      const currentRun = currentIndex.get(qId)!;

      const baselineResult = getConsensusResult(baselineRun, strategy);
      const currentResult = getConsensusResult(currentRun, strategy);

      // Skip questions that lack consensus evaluation for this strategy in either file
      if (!baselineResult || !currentResult) continue;

      if (baselineResult.correct) baselineCorrect++;
      else baselineWrong++;

      if (currentResult.correct) currentCorrect++;
      else currentWrong++;

      // Detect broken questions: correct in baseline, wrong in current
      if (baselineResult.correct && !currentResult.correct) {
        brokenQuestions.push({
          questionId: qId,
          dataset,
          strategy,
          groundTruth: baselineResult.expected,
          baselineAnswer: baselineResult.predicted ?? '(no answer)',
          currentAnswer: currentResult.predicted ?? '(no answer)',
        });
      }
    }

    const baselineTotal = baselineCorrect + baselineWrong;
    const currentTotal = currentCorrect + currentWrong;

    if (baselineTotal === 0 && currentTotal === 0) continue;

    const baselineAccuracy = baselineTotal > 0 ? baselineCorrect / baselineTotal : 0;
    const currentAccuracy = currentTotal > 0 ? currentCorrect / currentTotal : 0;
    const delta = currentAccuracy - baselineAccuracy;

    const { pValue } = fisherExact(baselineCorrect, baselineWrong, currentCorrect, currentWrong);

    perStrategy.push({
      strategy,
      dataset,
      baselineAccuracy,
      currentAccuracy,
      delta,
      pValue,
      significant: pValue < options.threshold,
    });
  }

  const hasSignificantRegression = perStrategy.some((s) => s.significant && s.delta < 0);

  return {
    tier: 'ci',
    timestamp: new Date().toISOString(),
    commitSha: 'local',
    baselineCommitSha: 'local',
    passed: !hasSignificantRegression,
    perStrategy,
    brokenQuestions,
    stability: undefined,
    cost: {
      totalTokens: 0,
      totalCostUsd: 0,
      durationMs: 0,
    },
  };
}
