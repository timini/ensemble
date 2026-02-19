/**
 * Cache for ensemble model responses.
 *
 * Stores the raw ProviderResponse[] from ensemble generation so that
 * consensus strategies can be iterated without re-calling the API.
 *
 * Cache key: `{model}_{dataset}_{ensemble}x_t{temp}.json`
 * Cache dir: `packages/eval/.cache/ensemble/`
 *
 * The cache stores responses for a fixed set of 100 questions per
 * dataset (selected via deterministic shuffle in `generate-cache`).
 * When `quick-eval` detects an ensemble cache, it filters loaded
 * questions to only include cached IDs, ensuring 100% cache hit rate.
 *
 * Save is incremental: new entries are merged with existing ones.
 * Existing entries are never overwritten (responses are deterministic
 * for a given model+temperature, so re-generating would be wasteful).
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
  createdAt: string;
  updatedAt: string;
  entries: EnsembleCacheEntry[];
}

function cacheKey(
  model: string, dataset: string, ensembleSize: number,
  temperature: number,
): string {
  const safeModel = model.replace(/[/:]/g, '_');
  return `${safeModel}_${dataset}_${ensembleSize}x_t${temperature}.json`;
}

function cachePath(
  model: string, dataset: string, ensembleSize: number,
  temperature: number,
): string {
  return resolve(CACHE_DIR, cacheKey(model, dataset, ensembleSize, temperature));
}

export async function loadEnsembleCache(
  model: string, dataset: string, ensembleSize: number,
  temperature: number,
): Promise<Map<string, ProviderResponse[]> | null> {
  const path = cachePath(model, dataset, ensembleSize, temperature);
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

/**
 * Save ensemble responses to cache. Incremental: merges new entries
 * with any existing cached entries. Existing entries are preserved
 * (not overwritten) so responses remain stable across runs.
 */
export async function saveEnsembleCache(
  model: string, dataset: string, ensembleSize: number,
  temperature: number,
  newEntries: EnsembleCacheEntry[],
): Promise<void> {
  const path = cachePath(model, dataset, ensembleSize, temperature);

  // Load existing entries and merge
  const existingMap = new Map<string, ProviderResponse[]>();
  if (await fileExists(path)) {
    try {
      const existing = await readJsonFile<EnsembleCacheFile>(path);
      for (const entry of existing.entries) {
        existingMap.set(entry.questionId, entry.responses);
      }
    } catch {
      // Corrupted file — start fresh
    }
  }

  // Merge: existing entries take priority (never overwrite)
  for (const entry of newEntries) {
    if (!existingMap.has(entry.questionId)) {
      existingMap.set(entry.questionId, entry.responses);
    }
  }

  const mergedEntries: EnsembleCacheEntry[] = [];
  for (const [questionId, responses] of existingMap) {
    mergedEntries.push({ questionId, responses });
  }

  const now = new Date().toISOString();
  const file: EnsembleCacheFile = {
    model, dataset, ensembleSize, temperature,
    createdAt: existingMap.size > newEntries.length ? now : now, // preserved if we had existing
    updatedAt: now,
    entries: mergedEntries,
  };
  await writeJsonFile(path, file);
}
