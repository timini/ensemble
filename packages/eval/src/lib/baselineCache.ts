/**
 * Cache for single-model baseline results.
 *
 * The single-model baseline runs the raw model against benchmark questions
 * without any consensus code. Note: since questions are now shuffled by
 * default, the cache is only valid when shuffle is disabled or the same
 * seed is used. Use --no-cache to ensure fresh results with random sampling.
 *
 * Cache key: `{model}_{dataset}_{sample}.json`
 * Cache dir: `packages/eval/.cache/baselines/`
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';
import type { PromptRunResult } from '../types.js';

// ES modules don't provide __dirname; derive it from import.meta.url
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
