import type { BenchmarkQuestion, DatasetLoadOptions } from '../types.js';
import { readJsonFile } from './io.js';
import { shuffleAndSample } from './benchmarkDatasetShared.js';

interface PromptObject {
  prompt: string;
  groundTruth?: string;
  category?: string;
  difficulty?: string;
}

function isPromptObject(value: unknown): value is PromptObject {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return typeof (value as PromptObject).prompt === 'string';
}

export async function loadLocalQuestions(
  datasetPath: string,
  options?: Pick<DatasetLoadOptions, 'sample' | 'shuffle' | 'seed'>,
): Promise<BenchmarkQuestion[]> {
  const parsed = await readJsonFile<unknown>(datasetPath);
  if (!Array.isArray(parsed)) {
    throw new Error(`Dataset must be a JSON array: ${datasetPath}`);
  }

  const questions = parsed
    .map((entry, index): BenchmarkQuestion | null => {
      if (typeof entry === 'string') {
        const prompt = entry.trim();
        return prompt.length === 0
          ? null
          : { id: `local-${index}`, prompt, groundTruth: '' };
      }

      if (!isPromptObject(entry)) {
        return null;
      }

      const prompt = entry.prompt.trim();
      if (!prompt) {
        return null;
      }

      return {
        id: `local-${index}`,
        prompt,
        groundTruth: entry.groundTruth?.trim() ?? '',
        category: entry.category?.trim(),
        difficulty: entry.difficulty?.trim(),
      };
    })
    .filter((entry): entry is BenchmarkQuestion => entry !== null);

  if (questions.length === 0) {
    throw new Error(`Dataset did not contain any prompts: ${datasetPath}`);
  }

  return shuffleAndSample(questions, options?.sample, {
    shuffle: options?.shuffle,
    seed: options?.seed,
  });
}
