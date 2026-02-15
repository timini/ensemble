import type { BenchmarkResultsFile, EvalMode, StrategyName } from '../types.js';

interface ResumeValidationOptions {
  dataset: string;
  mode: EvalMode;
  models: string[];
  strategies: StrategyName[];
  sampleSize: number;
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

export function assertValidResumedOutput(
  outputPath: string,
  parsed: unknown,
  options: ResumeValidationOptions,
): asserts parsed is BenchmarkResultsFile {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Resumed file "${outputPath}" does not contain a valid "runs" array.`);
  }

  const candidate = parsed as Partial<BenchmarkResultsFile>;
  if (!Array.isArray(candidate.runs)) {
    throw new Error(`Resumed file "${outputPath}" does not contain a valid "runs" array.`);
  }

  const mismatches: string[] = [];
  if (candidate.dataset !== options.dataset) {
    mismatches.push(`dataset (file: ${candidate.dataset}, new: ${options.dataset})`);
  }
  if (candidate.mode !== options.mode) {
    mismatches.push(`mode (file: ${candidate.mode}, new: ${options.mode})`);
  }
  if (
    !Array.isArray(candidate.models) ||
    JSON.stringify(sorted(candidate.models)) !== JSON.stringify(sorted(options.models))
  ) {
    mismatches.push('models');
  }
  if (
    !Array.isArray(candidate.strategies) ||
    JSON.stringify(sorted(candidate.strategies)) !==
      JSON.stringify(sorted(options.strategies))
  ) {
    mismatches.push('strategies');
  }
  if (candidate.sampleSize !== options.sampleSize) {
    mismatches.push(`sampleSize (file: ${candidate.sampleSize}, new: ${options.sampleSize})`);
  }

  if (mismatches.length > 0) {
    throw new Error(`Cannot resume benchmark with different parameters: ${mismatches.join('; ')}`);
  }
}

export function createBenchmarkFile(
  dataset: string,
  mode: EvalMode,
  models: string[],
  strategies: StrategyName[],
  sampleSize: number,
): BenchmarkResultsFile {
  const now = new Date().toISOString();
  return {
    type: 'benchmark',
    dataset,
    mode,
    models,
    strategies,
    sampleSize,
    createdAt: now,
    updatedAt: now,
    runs: [],
  };
}
