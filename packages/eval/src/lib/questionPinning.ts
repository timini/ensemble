import type { BenchmarkDatasetName, BenchmarkQuestion } from '../types.js';
import type { GoldenBaselineFile, TierConfig } from './regressionTypes.js';
import { benchmarkLoaders } from './benchmarkDatasetLoaders.js';

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces deterministic values in [0, 1).
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded random function.
 * Returns a new shuffled array without mutating the original.
 */
function seededShuffle<T>(items: readonly T[], rand: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Load questions matching the pinned IDs from a golden baseline.
 * Fetches from the dataset loaders and filters to only include
 * questions whose IDs appear in the baseline.
 *
 * @throws Error if any pinned question ID is not found in its dataset
 *   (indicates the upstream dataset has changed).
 */
export async function loadPinnedQuestions(
  baseline: GoldenBaselineFile,
): Promise<Map<BenchmarkDatasetName, BenchmarkQuestion[]>> {
  // Group pinned question IDs by dataset using the baseline results
  const idsByDataset = new Map<BenchmarkDatasetName, Set<string>>();
  for (const result of baseline.results) {
    const dataset = result.dataset;
    if (!idsByDataset.has(dataset)) {
      idsByDataset.set(dataset, new Set());
    }
    idsByDataset.get(dataset)!.add(result.questionId);
  }

  const output = new Map<BenchmarkDatasetName, BenchmarkQuestion[]>();

  for (const [dataset, pinnedIds] of idsByDataset) {
    const loader = benchmarkLoaders[dataset];
    const allQuestions = await loader.load();

    // Build a lookup map for fast ID matching
    const questionById = new Map<string, BenchmarkQuestion>();
    for (const q of allQuestions) {
      questionById.set(q.id, q);
    }

    // Check that all pinned IDs exist in the loaded dataset
    const missingIds: string[] = [];
    for (const id of pinnedIds) {
      if (!questionById.has(id)) {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      throw new Error(
        `Pinned question IDs not found in ${dataset} dataset (upstream may have changed): ${missingIds.join(', ')}`,
      );
    }

    // Collect matched questions preserving the order from pinnedIds
    const matched: BenchmarkQuestion[] = [];
    for (const id of pinnedIds) {
      matched.push(questionById.get(id)!);
    }

    output.set(dataset, matched);
  }

  return output;
}

/**
 * Sample and pin questions for a new baseline.
 * Loads questions from each dataset per tier config,
 * samples the specified number, and returns them for pinning.
 *
 * @param config - The tier configuration specifying datasets and sample sizes.
 * @param seed - Optional seed for deterministic random sampling.
 *   When omitted, sampling uses `Math.random()`.
 */
export async function pinQuestionsForBaseline(
  config: TierConfig,
  seed?: number,
): Promise<Map<BenchmarkDatasetName, BenchmarkQuestion[]>> {
  const rand =
    seed !== undefined ? seededRandom(seed) : () => Math.random();

  const output = new Map<BenchmarkDatasetName, BenchmarkQuestion[]>();

  for (const { name: dataset, sampleSize } of config.datasets) {
    const loader = benchmarkLoaders[dataset];
    const allQuestions = await loader.load();

    // Clamp sample size to available questions
    const actualSize = Math.min(sampleSize, allQuestions.length);

    // Shuffle and take the first `actualSize` questions
    const shuffled = seededShuffle(allQuestions, rand);
    output.set(dataset, shuffled.slice(0, actualSize));
  }

  return output;
}
