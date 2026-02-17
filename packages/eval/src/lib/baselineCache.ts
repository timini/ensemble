/**
 * Cache for single-model baseline results.
 *
 * The single-model baseline runs the raw model against benchmark questions
 * without any consensus code. Since the questions are deterministic (sliced,
 * not shuffled) and the model isn't going through our production code, the
 * results are stable and can be cached across runs.
 *
 * Cache key: `{model}_{dataset}_{sample}.json`
 * Cache dir: `packages/eval/.cache/baselines/`
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';
import type { PromptRunResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = resolve(__dirname, '../../.cache/baselines');

function cacheKey(model: string, dataset: string, sample: number): string {
  // Sanitize model name for filesystem (replace colons, slashes)
  const safeModel = model.replace(/[/:]/g, '_');
  return `${safeModel}_${dataset}_n${sample}.json`;
}

function cachePath(model: string, dataset: string, sample: number): string {
  return resolve(CACHE_DIR, cacheKey(model, dataset, sample));
}

export async function loadCachedBaseline(
  model: string,
  dataset: string,
  sample: number,
): Promise<PromptRunResult[] | null> {
  const path = cachePath(model, dataset, sample);
  if (!(await fileExists(path))) return null;
  try {
    return await readJsonFile<PromptRunResult[]>(path);
  } catch {
    return null;
  }
}

export async function saveCachedBaseline(
  model: string,
  dataset: string,
  sample: number,
  runs: PromptRunResult[],
): Promise<void> {
  const path = cachePath(model, dataset, sample);
  await writeJsonFile(path, runs);
}
