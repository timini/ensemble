import type {
  BenchmarkDatasetName,
  BenchmarkLoader,
  BenchmarkQuestion,
  DatasetLoadOptions,
} from '../types.js';
import { benchmarkLoaders } from './benchmarkDatasetLoaders.js';
import { resolveBenchmarkDatasetName } from './benchmarkDatasetShared.js';
import { loadLocalQuestions } from './localBenchmarkDataset.js';

export { resolveBenchmarkDatasetName } from './benchmarkDatasetShared.js';

export function getBenchmarkLoader(name: BenchmarkDatasetName): BenchmarkLoader {
  return benchmarkLoaders[name];
}

export async function loadBenchmarkQuestions(
  dataset: string,
  options?: DatasetLoadOptions,
): Promise<{ datasetName: BenchmarkDatasetName | null; questions: BenchmarkQuestion[] }> {
  const datasetName = resolveBenchmarkDatasetName(dataset);
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
