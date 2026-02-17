import type { ProviderMode, ProviderName } from '@ensemble-ai/shared-utils/providers';

export type EvalProvider = ProviderName;
export type EvalMode = Extract<ProviderMode, 'mock' | 'free'>;
export type StrategyName = 'standard' | 'elo' | 'majority';
export type BenchmarkDatasetName = 'gsm8k' | 'truthfulqa' | 'gpqa';

export interface ModelSpec {
  provider: EvalProvider;
  model: string;
}

export interface BenchmarkQuestion {
  id: string;
  prompt: string;
  groundTruth: string;
  category?: string;
  difficulty?: string;
}

export interface DatasetLoadOptions {
  sample?: number;
  skipDownload?: boolean;
  forceDownload?: boolean;
}

export interface BenchmarkLoader {
  name: BenchmarkDatasetName;
  load(options?: DatasetLoadOptions): Promise<BenchmarkQuestion[]>;
}

export interface EvaluationResult {
  correct: boolean;
  expected: string;
  predicted: string | null;
}

export interface PromptEvaluation {
  evaluator: 'numeric' | 'mcq' | 'generative';
  groundTruth: string;
  accuracy: number;
  results: Record<string, EvaluationResult>;
}

export interface ProviderResponse {
  provider: EvalProvider;
  model: string;
  content: string;
  responseTimeMs: number;
  tokenCount?: number;
  estimatedCostUsd?: number;
  error?: string;
}

export interface SelfConsistencyResult {
  runs: number;
  majorityAnswer: string | null;
  majorityCount: number;
  correct: boolean | null;
}

export interface ConsensusEvaluation {
  evaluator: PromptEvaluation['evaluator'];
  groundTruth: string;
  results: Partial<Record<StrategyName, EvaluationResult>>;
}

export interface PromptRunResult {
  questionId?: string;
  prompt: string;
  groundTruth?: string;
  category?: string;
  difficulty?: string;
  responses: ProviderResponse[];
  consensus: Partial<Record<StrategyName, string>>;
  evaluation?: PromptEvaluation;
  consensusEvaluation?: ConsensusEvaluation;
  selfConsistency?: SelfConsistencyResult;
  /** Total wall-clock time for this question (model calls + consensus + eval). */
  durationMs?: number;
}

export interface BenchmarkResultsFile {
  type: 'benchmark';
  dataset: string;
  mode: EvalMode;
  models: string[];
  strategies: StrategyName[];
  sampleSize: number;
  createdAt: string;
  updatedAt: string;
  runs: PromptRunResult[];
}

export interface BaselineResultsFile {
  type: 'baseline';
  dataset: string;
  mode: EvalMode;
  model: string;
  sampleSize: number;
  createdAt: string;
  updatedAt: string;
  runs: PromptRunResult[];
}
