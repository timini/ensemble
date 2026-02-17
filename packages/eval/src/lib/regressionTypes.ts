import type { BenchmarkDatasetName, EvaluationResult, ModelSpec, StrategyName } from '../types.js';

/** All supported evaluation tier names. */
export type TierName =
  | 'ci'
  | 'post-merge'
  | 'homogeneous-ci'
  | 'homogeneous-post-merge';

/** Configuration for a CI or post-merge evaluation tier. */
export interface TierConfig {
  /** The evaluation tier name. */
  name: TierName;
  /** Datasets to evaluate with their sample sizes. */
  datasets: Array<{ name: BenchmarkDatasetName; sampleSize: number }>;
  /** Models to include in the evaluation ensemble. */
  models: ModelSpec[];
  /** Consensus strategies to evaluate. */
  strategies: StrategyName[];
  /** Number of repeated runs for stability measurement. */
  runs: number;
  /** Delay in milliseconds between API requests to avoid rate limiting. */
  requestDelayMs: number;
  /** p-value threshold below which a regression is considered significant. */
  significanceThreshold: number;
  /** Model used to produce the meta-analysis summary. */
  summarizer: ModelSpec;
}

/** Committed baseline file used for paired comparison against new runs. */
export interface GoldenBaselineFile {
  /** The evaluation tier this baseline was generated for. */
  tier: TierName;
  /** ISO 8601 timestamp of when this baseline was created. */
  createdAt: string;
  /** Git commit SHA that produced this baseline. */
  commitSha: string;
  /** Tier configuration used when generating this baseline. */
  config: TierConfig;
  /** Pinned question IDs to ensure paired comparison consistency. */
  questionIds: string[];
  /** Per-question evaluation results for the baseline. */
  results: BaselineQuestionResult[];
}

/** Per-question baseline data capturing model and consensus results. */
export interface BaselineQuestionResult {
  /** Unique identifier for the benchmark question. */
  questionId: string;
  /** Dataset this question belongs to. */
  dataset: BenchmarkDatasetName;
  /** Expected correct answer for the question. */
  groundTruth: string;
  /** Per-model evaluation results keyed by model identifier. */
  modelResults: Record<string, EvaluationResult>;
  /** Per-strategy consensus evaluation results. */
  consensusResults: Partial<Record<StrategyName, EvaluationResult>>;
}

/** Regression result for a single strategy x dataset combination. */
export interface StrategyRegressionResult {
  /** The consensus strategy being evaluated. */
  strategy: StrategyName;
  /** The benchmark dataset being evaluated. */
  dataset: BenchmarkDatasetName;
  /** Accuracy from the committed baseline. */
  baselineAccuracy: number;
  /** Accuracy from the current evaluation run. */
  currentAccuracy: number;
  /** Change in accuracy (`currentAccuracy` - `baselineAccuracy`). */
  delta: number;
  /** p-value from the paired statistical test. */
  pValue: number;
  /** Whether the regression is statistically significant. */
  significant: boolean;
}

/** A question that regressed: was correct in baseline but wrong in current run. */
export interface BrokenQuestion {
  /** Unique identifier for the benchmark question that regressed. */
  questionId: string;
  /** Dataset this question belongs to. */
  dataset: BenchmarkDatasetName;
  /** The consensus strategy under which the regression occurred. */
  strategy: StrategyName;
  /** Expected correct answer. */
  groundTruth: string;
  /** Answer from the baseline run (was correct). */
  baselineAnswer: string;
  /** Answer from the current run (now wrong). */
  currentAnswer: string;
}

/** Variance metrics across multiple runs within a single evaluation tier. */
export interface StabilityMetrics {
  /** Number of runs that completed successfully. */
  runsCompleted: number;
  /** Accuracy variance per strategy across repeated runs. */
  accuracyVariance: Record<StrategyName, number>;
}

/** Cost and resource tracking for an evaluation run. */
export interface CostMetrics {
  /** Total tokens consumed across all API calls. */
  totalTokens: number;
  /** Total estimated cost in USD. */
  totalCostUsd: number;
  /** Wall-clock duration of the evaluation in milliseconds. */
  durationMs: number;
}

/** Complete output of a regression evaluation comparing current code against a baseline. */
export interface RegressionResult {
  /** The evaluation tier that produced this result. */
  tier: TierName;
  /** ISO 8601 timestamp of when this evaluation was run. */
  timestamp: string;
  /** Git commit SHA of the code being evaluated. */
  commitSha: string;
  /** Git commit SHA of the baseline being compared against. */
  baselineCommitSha: string;
  /** Whether the evaluation passed (no significant regressions detected). */
  passed: boolean;
  /** Per-strategy x dataset regression results. */
  perStrategy: StrategyRegressionResult[];
  /** Questions that were correct in baseline but wrong in current run. */
  brokenQuestions: BrokenQuestion[];
  /** Stability metrics from repeated runs, if available (undefined if runs === 1). */
  stability: StabilityMetrics | undefined;
  /** Cost and resource usage for this evaluation. */
  cost: CostMetrics;
}
