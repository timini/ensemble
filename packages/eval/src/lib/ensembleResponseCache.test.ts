import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderResponse } from '../types.js';

// Mock the module-level CACHE_DIR so tests use a temp directory
let tempDir = '';

vi.mock('./io.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./io.js')>();
  return original;
});

describe('ensembleResponseCache', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ensemble-response-cache-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('returns null for cache miss', async () => {
    const { loadCachedEnsembleResponses } = await import('./ensembleResponseCache.js');
    const result = await loadCachedEnsembleResponses(
      'nonexistent-model',
      'gsm8k',
      10,
      3,
    );
    expect(result).toBeNull();
  });

  it('saves and loads cached ensemble responses', async () => {
    const { writeJsonFile } = await import('./io.js');
    const { loadCachedEnsembleResponses, saveCachedEnsembleResponses } = await import(
      './ensembleResponseCache.js'
    );

    const responses: ProviderResponse[][] = [
      [
        { provider: 'google', model: 'gemini-flash', content: 'Answer 1', responseTimeMs: 10 },
        { provider: 'google', model: 'gemini-flash', content: 'Answer 2', responseTimeMs: 12 },
        { provider: 'google', model: 'gemini-flash', content: 'Answer 3', responseTimeMs: 15 },
      ],
      [
        { provider: 'google', model: 'gemini-flash', content: 'Answer 4', responseTimeMs: 8 },
        { provider: 'google', model: 'gemini-flash', content: 'Answer 5', responseTimeMs: 11 },
        { provider: 'google', model: 'gemini-flash', content: 'Answer 6', responseTimeMs: 14 },
      ],
    ];

    await saveCachedEnsembleResponses('google:gemini-flash', 'gsm8k', 10, 3, responses);
    const loaded = await loadCachedEnsembleResponses('google:gemini-flash', 'gsm8k', 10, 3);

    expect(loaded).toEqual(responses);
  });

  it('returns null for different cache key parameters', async () => {
    const { loadCachedEnsembleResponses, saveCachedEnsembleResponses } = await import(
      './ensembleResponseCache.js'
    );

    const responses: ProviderResponse[][] = [
      [{ provider: 'google', model: 'gemini-flash', content: 'A', responseTimeMs: 10 }],
    ];

    await saveCachedEnsembleResponses('google:gemini-flash', 'gsm8k', 10, 3, responses);

    // Different dataset
    expect(await loadCachedEnsembleResponses('google:gemini-flash', 'truthfulqa', 10, 3)).toBeNull();
    // Different ensemble size
    expect(await loadCachedEnsembleResponses('google:gemini-flash', 'gsm8k', 10, 5)).toBeNull();
    // Different sample
    expect(await loadCachedEnsembleResponses('google:gemini-flash', 'gsm8k', 20, 3)).toBeNull();
  });
});
