import type {
  BenchmarkDatasetName,
  BenchmarkLoader,
  BenchmarkQuestion,
} from '../types.js';
import { benchmarkLoaders } from './benchmarkDatasetLoaders.js';
import {
  resolveBenchmarkDatasetName as resolveAliasName,
} from './benchmarkDatasetShared.js';
import { loadLocalQuestions } from './localBenchmarkDataset.js';

export function resolveBenchmarkDatasetName(
  dataset: string,
): BenchmarkDatasetName | null {
  return resolveAliasName(dataset);
}

export function getBenchmarkLoader(name: BenchmarkDatasetName): BenchmarkLoader {
  return benchmarkLoaders[name];
}

export async function loadBenchmarkQuestions(
  dataset: string,
  options?: { sample?: number },
): Promise<{ datasetName: BenchmarkDatasetName | null; questions: BenchmarkQuestion[] }> {
  const datasetName = resolveAliasName(dataset);
  if (!datasetName) {
    return {
      datasetName: null,
      questions: await loadLocalQuestions(dataset, options?.sample),
    };
  }

  return {
    datasetName,
    questions: await benchmarkLoaders[datasetName].load(options),
  };
}
