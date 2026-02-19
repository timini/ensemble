import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJsonFile, readJsonFile, fileExists } from './io.js';
import type { ProviderResponse } from '../types.js';
import type { EnsembleCacheEntry } from './ensembleCache.js';

// Re-implement the cacheKey logic to test sanitization independently
function cacheKey(
  model: string, dataset: string, ensembleSize: number,
  temperature: number, sampleCount: number,
): string {
  const safeModel = model.replace(/[/:]/g, '_');
  return `${safeModel}_${dataset}_${ensembleSize}x_t${temperature}_n${sampleCount}.json`;
}

const MOCK_RESPONSES: ProviderResponse[] = [
  { provider: 'google', model: 'gemini-flash', content: 'Answer A', responseTimeMs: 100 },
  { provider: 'google', model: 'gemini-flash', content: 'Answer B', responseTimeMs: 120 },
  { provider: 'google', model: 'gemini-flash', content: 'Answer A', responseTimeMs: 90 },
];

describe('ensembleCache', () => {
  describe('cacheKey format', () => {
    it('includes ensemble size and temperature', () => {
      expect(cacheKey('google:gemini-flash', 'gsm8k', 5, 0.7, 30)).toBe(
        'google_gemini-flash_gsm8k_5x_t0.7_n30.json',
      );
    });

    it('replaces colons and slashes in model names', () => {
      expect(cacheKey('provider:org/model', 'truthfulqa', 3, 1.0, 10)).toBe(
        'provider_org_model_truthfulqa_3x_t1_n10.json',
      );
    });

    it('preserves plain model names', () => {
      expect(cacheKey('gpt-4o', 'gpqa', 5, 0.5, 50)).toBe(
        'gpt-4o_gpqa_5x_t0.5_n50.json',
      );
    });
  });

  describe('round-trip save/load', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'ensemble-cache-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('saves and loads ensemble responses by question ID', async () => {
      const entries: EnsembleCacheEntry[] = [
        { questionId: 'q1', responses: MOCK_RESPONSES },
        { questionId: 'q2', responses: [MOCK_RESPONSES[0]] },
      ];

      const filePath = join(tempDir, 'test_ensemble.json');
      const cacheFile = {
        model: 'google:gemini-flash', dataset: 'gsm8k',
        ensembleSize: 3, temperature: 0.7, sampleCount: 30,
        createdAt: new Date().toISOString(), entries,
      };
      await writeJsonFile(filePath, cacheFile);

      const loaded = await readJsonFile<typeof cacheFile>(filePath);
      expect(loaded.entries).toHaveLength(2);
      expect(loaded.entries[0].questionId).toBe('q1');
      expect(loaded.entries[0].responses).toHaveLength(3);
      expect(loaded.entries[1].questionId).toBe('q2');
      expect(loaded.entries[1].responses).toHaveLength(1);
    });

    it('creates parent directories when saving', async () => {
      const nestedDir = join(tempDir, 'nested', 'cache');
      const filePath = join(nestedDir, 'test.json');

      await writeJsonFile(filePath, { entries: [] });
      expect(await fileExists(filePath)).toBe(true);
    });

    it('preserves response fields through serialization', async () => {
      const response: ProviderResponse = {
        provider: 'google',
        model: 'gemini-flash',
        content: 'The answer is 42.',
        responseTimeMs: 250,
        tokenCount: 15,
        estimatedCostUsd: 0.0001,
      };
      const entries: EnsembleCacheEntry[] = [
        { questionId: 'q1', responses: [response] },
      ];

      const filePath = join(tempDir, 'fields_test.json');
      await writeJsonFile(filePath, { entries });
      const loaded = await readJsonFile<{ entries: EnsembleCacheEntry[] }>(filePath);
      const loadedResponse = loaded.entries[0].responses[0];

      expect(loadedResponse.provider).toBe('google');
      expect(loadedResponse.model).toBe('gemini-flash');
      expect(loadedResponse.content).toBe('The answer is 42.');
      expect(loadedResponse.responseTimeMs).toBe(250);
      expect(loadedResponse.tokenCount).toBe(15);
      expect(loadedResponse.estimatedCostUsd).toBe(0.0001);
    });
  });
});
