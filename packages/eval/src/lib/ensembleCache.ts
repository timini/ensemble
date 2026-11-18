/**
 * Cache for ensemble model responses.
 *
 * Stores the raw ProviderResponse[] from ensemble generation so that
 * consensus strategies can be iterated without re-calling the API.
 *
 * Cache key: `{model}_{dataset}_{ensemble}x_t{temp}.json` for legacy
 * caches (free-text replies, unshuffled options), and
 * `{model}_{dataset}_{ensemble}x_t{temp}_structured.json` for caches made
 * with the structured answer protocol (see methodology.ts). The two never
 * mix: a structured run cannot be scored against legacy replies.
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
import type { AnswerProtocol } from './methodology.js';

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
  /** Missing on caches made before the structured protocol, which are legacy. */
  protocol?: AnswerProtocol;
  /** Seed the options were shuffled with, on structured caches. */
  optionSeed?: number;
  createdAt: string;
  updatedAt: string;
  entries: EnsembleCacheEntry[];
}

/** File name of an ensemble cache. Legacy caches keep their original names. */
export function ensembleCacheFileName(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, protocol: AnswerProtocol = 'legacy',
): string {
  const safeModel = model.replace(/[/:#]/g, '_');
  const suffix = protocol === 'structured' ? '_structured' : '';
  return `${safeModel}_${dataset}_${ensembleSize}x_t${temperature}${suffix}.json`;
}

function cachePath(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, protocol: AnswerProtocol,
): string {
  return resolve(CACHE_DIR, ensembleCacheFileName(model, dataset, ensembleSize, temperature, protocol));
}

export async function loadEnsembleCache(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, protocol: AnswerProtocol = 'legacy',
): Promise<Map<string, ProviderResponse[]> | null> {
  const path = cachePath(model, dataset, ensembleSize, temperature, protocol);
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
  protocol: AnswerProtocol = 'legacy',
  optionSeed?: number,
): Promise<void> {
  const path = cachePath(model, dataset, ensembleSize, temperature, protocol);

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
    ...(protocol === 'structured' ? { protocol, ...(optionSeed !== undefined ? { optionSeed } : {}) } : {}),
    createdAt: existingMap.size > newEntries.length ? now : now, // preserved if we had existing
    updatedAt: now,
    entries: mergedEntries,
  };
  await writeJsonFile(path, file);
}
