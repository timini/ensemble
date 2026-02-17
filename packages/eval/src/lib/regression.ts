import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  BenchmarkDatasetName,
  BenchmarkQuestion,
  BenchmarkResultsFile,
  PromptRunResult,
  StrategyName,
} from '../types.js';
import type {
  BaselineQuestionResult,
  BrokenQuestion,
  CostMetrics,
  EnsembleDelta,
  GoldenBaselineFile,
  RegressionResult,
  StabilityMetrics,
  StrategyRegressionResult,
  TierConfig,
} from './regressionTypes.js';
import type { BenchmarkRunnerProgress } from './benchmarkRunner.js';
import { BenchmarkRunner } from './benchmarkRunner.js';
import { loadPinnedQuestions } from './questionPinning.js';
import { fisherExact } from './fisherExact.js';
import { createBenchmarkFile } from '../commands/benchmarkOutput.js';

/**
 * Computes the median of a sorted array of numbers.
 * For even-length arrays, returns the average of the two middle values.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Computes the variance of a list of numbers.
 * Uses population variance (divides by N).
 */
function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

/**
 * Computes per-strategy accuracy from a set of prompt run results.
 * Returns a map from strategy name to { correct, total }.
 */
function computeStrategyAccuracy(
  runs: PromptRunResult[],
  strategies: StrategyName[],
): Map<StrategyName, { correct: number; total: number }> {
  const counts = new Map<StrategyName, { correct: number; total: number }>();
  for (const strategy of strategies) {
    counts.set(strategy, { correct: 0, total: 0 });
  }
  for (const run of runs) {
    for (const strategy of strategies) {
      const evalResult = run.consensusEvaluation?.results?.[strategy];
      if (evalResult) {
        const entry = counts.get(strategy)!;
        entry.total += 1;
        if (evalResult.correct) entry.correct += 1;
      }
    }
  }
  return counts;
}

/**
 * Computes per-strategy x dataset accuracy from a set of prompt run results.
 */
function computeStrategyDatasetAccuracy(
  runsByDataset: Map<BenchmarkDatasetName, PromptRunResult[]>,
  strategies: StrategyName[],
): Map<string, { correct: number; total: number }> {
  const counts = new Map<string, { correct: number; total: number }>();
  for (const [dataset, runs] of runsByDataset) {
    for (const strategy of strategies) {
      const key = `${strategy}:${dataset}`;
      let correct = 0;
      let total = 0;
      for (const run of runs) {
        const evalResult = run.consensusEvaluation?.results?.[strategy];
        if (evalResult) {
          total += 1;
          if (evalResult.correct) correct += 1;
        }
      }
      counts.set(key, { correct, total });
    }
  }
  return counts;
}

/**
 * Computes baseline per-strategy x dataset accuracy from the golden baseline.
 */
function computeBaselineStrategyDatasetAccuracy(
  baseline: GoldenBaselineFile,
  strategies: StrategyName[],
): Map<string, { correct: number; total: number }> {
  const counts = new Map<string, { correct: number; total: number }>();
  for (const result of baseline.results) {
    for (const strategy of strategies) {
      const key = `${strategy}:${result.dataset}`;
      const evalResult = result.consensusResults[strategy];
      if (evalResult) {
        const entry = counts.get(key) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (evalResult.correct) entry.correct += 1;
        counts.set(key, entry);
      }
    }
  }
  return counts;
}

/**
 * Identifies broken questions: questions correct in baseline but wrong in current run.
 */
function findBrokenQuestions(
  baseline: GoldenBaselineFile,
  runsByDataset: Map<BenchmarkDatasetName, PromptRunResult[]>,
  strategies: StrategyName[],
): BrokenQuestion[] {
  const broken: BrokenQuestion[] = [];

  // Build a lookup from questionId -> current run
  const currentByQuestionId = new Map<string, PromptRunResult>();
  for (const runs of runsByDataset.values()) {
    for (const run of runs) {
      if (run.questionId) {
        currentByQuestionId.set(run.questionId, run);
      }
    }
  }

  for (const baselineResult of baseline.results) {
    const currentRun = currentByQuestionId.get(baselineResult.questionId);
    if (!currentRun) continue;

    for (const strategy of strategies) {
      const baselineEval = baselineResult.consensusResults[strategy];
      const currentEval = currentRun.consensusEvaluation?.results?.[strategy];

      if (baselineEval?.correct && currentEval && !currentEval.correct) {
        broken.push({
          questionId: baselineResult.questionId,
          dataset: baselineResult.dataset,
          strategy,
          groundTruth: baselineResult.groundTruth,
          baselineAnswer: baselineEval.predicted ?? '',
          currentAnswer: currentEval.predicted ?? '',
        });
      }
    }
  }

  return broken;
}

/**
 * Aggregates cost metrics from benchmark results across all runs and datasets.
 */
function computeCostMetrics(
  allRunResults: Array<Map<BenchmarkDatasetName, BenchmarkResultsFile>>,
  durationMs: number,
): CostMetrics {
  let totalTokens = 0;
  let totalCostUsd = 0;

  for (const runsByDataset of allRunResults) {
    for (const results of runsByDataset.values()) {
      for (const run of results.runs) {
        for (const response of run.responses) {
          if (!response.error) {
            totalTokens += response.tokenCount ?? 0;
            totalCostUsd += response.estimatedCostUsd ?? 0;
          }
        }
      }
    }
  }

  return { totalTokens, totalCostUsd, durationMs };
}

/**
 * Computes per-model accuracy across all runs.
 * Returns a map from model key (e.g. "openai:gpt-4o-mini") to { correct, total }.
 */
function computeModelAccuracy(
  runs: PromptRunResult[],
): Map<string, { correct: number; total: number }> {
  const counts = new Map<string, { correct: number; total: number }>();
  for (const run of runs) {
    if (!run.evaluation?.results) continue;
    for (const [modelKey, evalResult] of Object.entries(run.evaluation.results)) {
      const entry = counts.get(modelKey) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (evalResult.correct) entry.correct += 1;
      counts.set(modelKey, entry);
    }
  }
  return counts;
}

/**
 * Computes the ensemble delta: best consensus strategy accuracy minus best
 * individual model accuracy.  Positive delta means ensemble adds value.
 */
export function computeEnsembleDelta(
  runs: PromptRunResult[],
  strategies: StrategyName[],
): EnsembleDelta | undefined {
  // Best model
  const modelAccuracy = computeModelAccuracy(runs);
  let bestModelName = '';
  let bestModelAcc = -1;
  for (const [modelKey, { correct, total }] of modelAccuracy) {
    if (total === 0) continue;
    const acc = correct / total;
    if (acc > bestModelAcc) {
      bestModelAcc = acc;
      bestModelName = modelKey;
    }
  }

  // Best strategy
  const strategyAccuracy = computeStrategyAccuracy(runs, strategies);
  let bestStrategyName: StrategyName = strategies[0];
  let bestStrategyAcc = -1;
  for (const [strategy, { correct, total }] of strategyAccuracy) {
    if (total === 0) continue;
    const acc = correct / total;
    if (acc > bestStrategyAcc) {
      bestStrategyAcc = acc;
      bestStrategyName = strategy;
    }
  }

  if (bestModelAcc < 0 || bestStrategyAcc < 0) {
    return undefined;
  }

  return {
    bestModelAccuracy: bestModelAcc,
    bestModelName,
    bestStrategyAccuracy: bestStrategyAcc,
    bestStrategyName,
    delta: bestStrategyAcc - bestModelAcc,
  };
}

/** Options for {@link RegressionDetector.evaluate}. */
export interface RegressionDetectorEvaluateOptions {
  onProgress?: (progress: BenchmarkRunnerProgress) => void;
  /** Git commit SHA of the code being evaluated. Defaults to `''` if not provided. */
  commitSha?: string;
}

/**
 * Factory function that creates a {@link BenchmarkRunner} configured for a
 * specific dataset.  This allows the regression detector to use the correct
 * evaluator (e.g. `NumericEvaluator` for gsm8k, `MCQEvaluator` for
 * truthfulqa) for each dataset rather than a single evaluator for all
 * datasets.
 */
export type RunnerFactory = (datasetName: BenchmarkDatasetName) => BenchmarkRunner;

/**
 * Detects regressions by running the current code against a golden baseline.
 *
 * For each strategy x dataset pair, compares current accuracy against the
 * baseline using Fisher's exact test (one-sided). For CI tier with multiple
 * runs, executes repeated runs and takes the median accuracy.
 *
 * @example
 * ```typescript
 * const factory = (ds) => new BenchmarkRunner({ ... evaluator: getEvaluator(ds) });
 * const detector = new RegressionDetector(tierConfig, baseline, factory);
 * const result = await detector.evaluate({ onProgress: console.log });
 * if (!result.passed) {
 *   console.error('Regression detected!', result.brokenQuestions);
 * }
 * ```
 */
export class RegressionDetector {
  private readonly runnerFactory: RunnerFactory;

  constructor(
    private readonly tier: TierConfig,
    private readonly baseline: GoldenBaselineFile,
    runnerOrFactory: BenchmarkRunner | RunnerFactory,
  ) {
    // Accept either a BenchmarkRunner (legacy) or a RunnerFactory.
    // A BenchmarkRunner is wrapped into a factory that ignores the dataset name.
    this.runnerFactory =
      typeof runnerOrFactory === 'function'
        ? runnerOrFactory
        : () => runnerOrFactory;
  }

  /**
   * Run the regression evaluation.
   *
   * 1. Loads pinned questions from the baseline
   * 2. Runs benchmark for each dataset (multiple runs for CI tier)
   * 3. Compares accuracy against baseline using Fisher's exact test
   * 4. Identifies broken questions and computes metrics
   *
   * @param options - Optional progress callback
   * @returns Complete regression evaluation result
   */
  async evaluate(options?: RegressionDetectorEvaluateOptions): Promise<RegressionResult> {
    const startTime = Date.now();

    // Step 1: Load pinned questions from baseline
    const pinnedQuestions = await loadPinnedQuestions(this.baseline);

    // Step 2: Run benchmarks (possibly multiple times for CI tier)
    const numRuns = this.tier.runs;
    const allRunResults: Array<Map<BenchmarkDatasetName, BenchmarkResultsFile>> = [];

    for (let runIndex = 0; runIndex < numRuns; runIndex++) {
      const datasetResults = await this.runAllDatasets(pinnedQuestions, options);
      allRunResults.push(datasetResults);
    }

    const durationMs = Date.now() - startTime;

    // Step 3: Compute per-strategy x dataset accuracy for current runs
    const strategies = this.tier.strategies;

    let perStrategy: StrategyRegressionResult[];
    let brokenQuestions: BrokenQuestion[];
    let stability: StabilityMetrics | undefined;

    if (numRuns > 1) {
      // CI tier: multiple runs, take median accuracy, compute stability
      const { medianCounts, allAccuracies, firstRunByDataset } =
        this.computeMultiRunMetrics(allRunResults, strategies);

      // Compute baseline accuracy
      const baselineCounts = computeBaselineStrategyDatasetAccuracy(
        this.baseline,
        strategies,
      );

      perStrategy = this.buildPerStrategyResults(
        medianCounts,
        baselineCounts,
        strategies,
      );

      // For broken questions, use the first run (representative)
      brokenQuestions = findBrokenQuestions(
        this.baseline,
        firstRunByDataset,
        strategies,
      );

      // Compute stability metrics
      const accuracyVariance: Record<StrategyName, number> = {} as Record<
        StrategyName,
        number
      >;
      for (const strategy of strategies) {
        const accs = allAccuracies.get(strategy) ?? [];
        accuracyVariance[strategy] = variance(accs);
      }
      stability = {
        runsCompleted: numRuns,
        accuracyVariance,
      };
    } else {
      // Single run (post-merge or single run)
      const datasetResults = allRunResults[0];
      const currentRunsByDataset = new Map<BenchmarkDatasetName, PromptRunResult[]>();
      for (const [dataset, results] of datasetResults) {
        currentRunsByDataset.set(dataset, results.runs);
      }

      const currentCounts = computeStrategyDatasetAccuracy(
        currentRunsByDataset,
        strategies,
      );
      const baselineCounts = computeBaselineStrategyDatasetAccuracy(
        this.baseline,
        strategies,
      );

      perStrategy = this.buildPerStrategyResults(
        currentCounts,
        baselineCounts,
        strategies,
      );

      brokenQuestions = findBrokenQuestions(
        this.baseline,
        currentRunsByDataset,
        strategies,
      );

      stability = undefined;
    }

    // Step 4: Determine if passed (no significant *regressions*)
    // A significant change with delta >= 0 is an improvement, not a regression.
    const passed = perStrategy.every(
      (result) => !result.significant || result.delta >= 0,
    );

    // Step 5: Compute cost metrics (aggregate across all runs)
    const cost = computeCostMetrics(allRunResults, durationMs);

    // Step 6: Compute ensemble delta (best strategy vs best individual model)
    // Use the first run's results for ensemble delta computation.
    const firstRunResults = allRunResults[0];
    const allFirstRunRuns: PromptRunResult[] = [];
    for (const results of firstRunResults.values()) {
      allFirstRunRuns.push(...results.runs);
    }
    const ensembleDelta = computeEnsembleDelta(allFirstRunRuns, strategies);

    return {
      tier: this.tier.name,
      timestamp: new Date().toISOString(),
      commitSha: options?.commitSha ?? '',
      baselineCommitSha: this.baseline.commitSha,
      passed,
      perStrategy,
      brokenQuestions,
      stability,
      cost,
      ensembleDelta,
    };
  }

  /**
   * Runs the benchmark for all datasets in the tier configuration.
   */
  private async runAllDatasets(
    pinnedQuestions: Map<BenchmarkDatasetName, BenchmarkQuestion[]>,
    options?: RegressionDetectorEvaluateOptions,
  ): Promise<Map<BenchmarkDatasetName, BenchmarkResultsFile>> {
    const scratchDir = await mkdtemp(join(tmpdir(), 'ensemble-regression-'));
    const results = new Map<BenchmarkDatasetName, BenchmarkResultsFile>();

    for (const { name: dataset, sampleSize } of this.tier.datasets) {
      const questions = pinnedQuestions.get(dataset) ?? [];
      const output = createBenchmarkFile(
        dataset,
        'mock',
        this.tier.models.map((m) => `${m.provider}:${m.model}`),
        this.tier.strategies,
        sampleSize,
      );

      const outputPath = join(scratchDir, `${dataset}-regression.json`);
      const runner = this.runnerFactory(dataset);

      const result = await runner.run({
        questions,
        output,
        outputPath,
        onProgress: options?.onProgress,
      });

      results.set(dataset, result);
    }

    return results;
  }

  /**
   * Computes median accuracy and stability metrics across multiple runs.
   */
  private computeMultiRunMetrics(
    allRunResults: Array<Map<BenchmarkDatasetName, BenchmarkResultsFile>>,
    strategies: StrategyName[],
  ): {
    medianCounts: Map<string, { correct: number; total: number }>;
    allAccuracies: Map<StrategyName, number[]>;
    firstRunByDataset: Map<BenchmarkDatasetName, PromptRunResult[]>;
  } {
    // Collect per-strategy x dataset accuracies across all runs
    const accuraciesByKey = new Map<string, number[]>();
    const countsByKey = new Map<string, { correct: number; total: number }[]>();
    const allAccuracies = new Map<StrategyName, number[]>();

    // Also collect per-strategy (aggregated across datasets) accuracies
    const strategyAccuraciesPerRun = new Map<StrategyName, number[]>();
    for (const strategy of strategies) {
      strategyAccuraciesPerRun.set(strategy, []);
    }

    for (const datasetResults of allRunResults) {
      const runsByDataset = new Map<BenchmarkDatasetName, PromptRunResult[]>();
      for (const [dataset, results] of datasetResults) {
        runsByDataset.set(dataset, results.runs);
      }

      const counts = computeStrategyDatasetAccuracy(runsByDataset, strategies);

      for (const [key, { correct, total }] of counts) {
        if (!accuraciesByKey.has(key)) accuraciesByKey.set(key, []);
        if (!countsByKey.has(key)) countsByKey.set(key, []);
        const acc = total > 0 ? correct / total : 0;
        accuraciesByKey.get(key)!.push(acc);
        countsByKey.get(key)!.push({ correct, total });
      }

      // Aggregate per-strategy accuracy across all datasets for this run
      const strategyAcc = computeStrategyAccuracy(
        [...runsByDataset.values()].flat(),
        strategies,
      );
      for (const strategy of strategies) {
        const entry = strategyAcc.get(strategy)!;
        const acc = entry.total > 0 ? entry.correct / entry.total : 0;
        strategyAccuraciesPerRun.get(strategy)!.push(acc);
      }
    }

    // For allAccuracies, use per-strategy aggregated accuracies
    for (const strategy of strategies) {
      allAccuracies.set(strategy, strategyAccuraciesPerRun.get(strategy)!);
    }

    // Compute median counts: find the run whose accuracy is closest to the median
    // and use that run's counts for the Fisher's exact test
    const medianCounts = new Map<string, { correct: number; total: number }>();
    for (const [key, accs] of accuraciesByKey) {
      const counts = countsByKey.get(key)!;
      const med = median(accs);
      // Find the run index with accuracy closest to median
      const bestIndex = accs.reduce(
        (best, current, index) => {
          const diff = Math.abs(current - med);
          return diff < best.diff ? { diff, index } : best;
        },
        { diff: Infinity, index: 0 },
      ).index;
      medianCounts.set(key, counts[bestIndex]);
    }

    // Use the first run for broken question analysis
    const firstRunByDataset = new Map<BenchmarkDatasetName, PromptRunResult[]>();
    const firstRun = allRunResults[0];
    for (const [dataset, results] of firstRun) {
      firstRunByDataset.set(dataset, results.runs);
    }

    return { medianCounts, allAccuracies, firstRunByDataset };
  }

  /**
   * Builds per-strategy regression results using Fisher's exact test.
   */
  private buildPerStrategyResults(
    currentCounts: Map<string, { correct: number; total: number }>,
    baselineCounts: Map<string, { correct: number; total: number }>,
    strategies: StrategyName[],
  ): StrategyRegressionResult[] {
    const results: StrategyRegressionResult[] = [];

    for (const { name: dataset } of this.tier.datasets) {
      for (const strategy of strategies) {
        const key = `${strategy}:${dataset}`;
        const baseline = baselineCounts.get(key) ?? { correct: 0, total: 0 };
        const current = currentCounts.get(key) ?? { correct: 0, total: 0 };

        const baselineAccuracy =
          baseline.total > 0 ? baseline.correct / baseline.total : 0;
        const currentAccuracy =
          current.total > 0 ? current.correct / current.total : 0;

        // Fisher's exact test: baseline correct/wrong vs current correct/wrong
        const baselineWrong = baseline.total - baseline.correct;
        const currentWrong = current.total - current.correct;
        const { pValue } = fisherExact(
          baseline.correct,
          baselineWrong,
          current.correct,
          currentWrong,
        );

        results.push({
          strategy,
          dataset,
          baselineAccuracy,
          currentAccuracy,
          delta: currentAccuracy - baselineAccuracy,
          pValue,
          significant: pValue < this.tier.significanceThreshold,
        });
      }
    }

    return results;
  }
}
