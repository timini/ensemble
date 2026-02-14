import type { ProviderMode, ProviderName } from '@ensemble-ai/shared-utils/providers';

export type EvalProvider = ProviderName;
export type EvalMode = Extract<ProviderMode, 'mock' | 'free'>;
export type StrategyName = 'standard' | 'elo';

export interface ModelSpec {
  provider: EvalProvider;
  model: string;
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
  prompt: string;
  responses: ProviderResponse[];
  consensus: Partial<Record<StrategyName, string>>;
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
