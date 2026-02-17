/**
 * Cache for ensemble responses (raw model outputs before consensus).
 *
 * When only consensus code changes, the raw ensemble responses would be
 * identical. This cache avoids re-running 90 LLM calls (3 models x 30
 * questions) when those responses haven't changed.
 *
 * Cache key: `{model}_{dataset}_n{sample}_ensemble{size}.json`
 * Cache dir: `packages/eval/.cache/ensemble-responses/`
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';
import type { ProviderResponse } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = resolve(__dirname, '../../.cache/ensemble-responses');

function cacheKey(
  model: string,
  dataset: string,
  sample: number,
  ensembleSize: number,
): string {
  const safeModel = model.replace(/[/:]/g, '_');
  return `${safeModel}_${dataset}_n${sample}_ensemble${ensembleSize}.json`;
}

function cachePath(
  model: string,
  dataset: string,
  sample: number,
  ensembleSize: number,
): string {
  return resolve(CACHE_DIR, cacheKey(model, dataset, sample, ensembleSize));
}

export async function loadCachedEnsembleResponses(
  model: string,
  dataset: string,
  sample: number,
  ensembleSize: number,
): Promise<ProviderResponse[][] | null> {
  const path = cachePath(model, dataset, sample, ensembleSize);
  if (!(await fileExists(path))) return null;
  try {
    return await readJsonFile<ProviderResponse[][]>(path);
  } catch {
    return null;
  }
}

export async function saveCachedEnsembleResponses(
  model: string,
  dataset: string,
  sample: number,
  ensembleSize: number,
  responses: ProviderResponse[][],
): Promise<void> {
  const path = cachePath(model, dataset, sample, ensembleSize);
  await writeJsonFile(path, responses);
}
