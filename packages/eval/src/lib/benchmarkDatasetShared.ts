import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BenchmarkDatasetName } from '../types.js';

const DATASET_ALIASES: Record<string, BenchmarkDatasetName> = {
  gsm8k: 'gsm8k',
  truthfulqa: 'truthfulqa',
  truthful_qa: 'truthfulqa',
  gpqa: 'gpqa',
  'gpqa-diamond': 'gpqa',
  gpqa_diamond: 'gpqa',
  hle: 'hle',
  'humanitys-last-exam': 'hle',
  math500: 'math500',
  'math-500': 'math500',
  mmlu_pro: 'mmlu_pro',
  'mmlu-pro': 'mmlu_pro',
  mmlupro: 'mmlu_pro',
  simpleqa: 'simpleqa',
  'simple-qa': 'simpleqa',
};

export function resolveBenchmarkDatasetName(
  dataset: string,
): BenchmarkDatasetName | null {
  const normalized = dataset.trim().toLowerCase();
  return DATASET_ALIASES[normalized] ?? null;
}

export function normalizeSample(sample: number | undefined, total: number): number {
  if (sample === undefined) {
    return total;
  }
  if (!Number.isInteger(sample) || sample <= 0) {
    throw new Error(`Sample must be a positive integer. Received: ${sample}`);
  }

  return Math.min(sample, total);
}

export function toChoiceLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 26) {
    throw new Error(`Choice index out of range: ${index}`);
  }

  const letterCode = 'A'.charCodeAt(0) + index;
  return String.fromCharCode(letterCode);
}

export function createCachePath(name: BenchmarkDatasetName): string {
  const fromEnv = process.env.ENSEMBLE_EVAL_DATASETS_DIR;
  if (fromEnv && fromEnv.trim().length > 0) {
    return resolve(fromEnv, `${name}.json`);
  }

  const currentFile = dirname(fileURLToPath(import.meta.url));
  return resolve(currentFile, '../../datasets', `${name}.json`);
}
