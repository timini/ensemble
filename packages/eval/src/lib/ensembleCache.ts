/**
 * Cache for ensemble model responses.
 *
 * Stores the raw ProviderResponse[] from ensemble generation so that
 * consensus strategies can be iterated without re-calling the API.
 *
 * Cache key: `{model}_{dataset}_{ensemble}x_t{temp}_n{sample}.json`
 * Cache dir: `packages/eval/.cache/ensemble/`
 *
 * The cache stores a map of questionId → ProviderResponse[] so that
 * individual questions can be looked up efficiently.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';
import type { ProviderResponse } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = resolve(__dirname, '../../.cache/ensemble');

export interface EnsembleCacheEntry {
  questionId: string;
  responses: ProviderResponse[];
}

interface EnsembleCacheFile {
  model: string;
  dataset: string;
  ensembleSize: number;
  temperature: number;
  sampleCount: number;
  createdAt: string;
  entries: EnsembleCacheEntry[];
}

function cacheKey(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, sampleCount: number,
): string {
  const safeModel = model.replace(/[/:]/g, '_');
  return `${safeModel}_${dataset}_${ensembleSize}x_t${temperature}_n${sampleCount}.json`;
}

function cachePath(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, sampleCount: number,
): string {
  return resolve(CACHE_DIR, cacheKey(model, dataset, ensembleSize, temperature, sampleCount));
}

export async function loadEnsembleCache(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, sampleCount: number,
): Promise<Map<string, ProviderResponse[]> | null> {
  const path = cachePath(model, dataset, ensembleSize, temperature, sampleCount);
  if (!(await fileExists(path))) return null;
  try {
    const file = await readJsonFile<EnsembleCacheFile>(path);
    const map = new Map<string, ProviderResponse[]>();
    for (const entry of file.entries) {
      map.set(entry.questionId, entry.responses);
    }
    return map;
  } catch {
    return null;
  }
}

export async function saveEnsembleCache(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, sampleCount: number,
  entries: EnsembleCacheEntry[],
): Promise<void> {
  const path = cachePath(model, dataset, ensembleSize, temperature, sampleCount);
  const file: EnsembleCacheFile = {
    model, dataset, ensembleSize, temperature, sampleCount,
    createdAt: new Date().toISOString(),
    entries,
  };
  await writeJsonFile(path, file);
}
