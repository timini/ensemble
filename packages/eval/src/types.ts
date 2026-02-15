import type { ProviderMode, ProviderName } from '@ensemble-ai/shared-utils/providers';

export type EvalProvider = ProviderName;
export type EvalMode = Extract<ProviderMode, 'mock' | 'free'>;
export type StrategyName = 'standard' | 'elo';
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

export interface BenchmarkLoader {
  name: BenchmarkDatasetName;
  load(options?: { sample?: number }): Promise<BenchmarkQuestion[]>;
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
  error?: string;
}

export interface PromptRunResult {
  questionId?: string;
  prompt: string;
  groundTruth?: string;
  responses: ProviderResponse[];
  consensus: Partial<Record<StrategyName, string>>;
  evaluation?: PromptEvaluation;
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
