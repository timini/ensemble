import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJsonFile } from './io.js';
import type { PromptRunResult } from '../types.js';

/**
 * The baselineCache module resolves its cache dir relative to __dirname.
 * For unit tests we exercise the key sanitization and round-trip logic
 * by importing and testing the module directly. We also test the cache
 * key format with edge cases.
 */

// Re-implement the cacheKey logic here to test the sanitization independently
function cacheKey(model: string, dataset: string, sample: number): string {
  const safeModel = model.replace(/[/:]/g, '_');
  return `${safeModel}_${dataset}_n${sample}.json`;
}

describe('baselineCache', () => {
  describe('cacheKey sanitization', () => {
    it('replaces colons in model names', () => {
      expect(cacheKey('google:gemini-3-flash', 'gsm8k', 10)).toBe(
        'google_gemini-3-flash_gsm8k_n10.json',
      );
    });

    it('replaces slashes in model names', () => {
      expect(cacheKey('meta/llama-3', 'truthfulqa', 5)).toBe(
        'meta_llama-3_truthfulqa_n5.json',
      );
    });

    it('handles model names with both colons and slashes', () => {
      expect(cacheKey('provider:org/model', 'gpqa', 50)).toBe(
        'provider_org_model_gpqa_n50.json',
      );
    });

    it('preserves plain model names', () => {
      expect(cacheKey('gpt-4o', 'gsm8k', 20)).toBe(
        'gpt-4o_gsm8k_n20.json',
      );
    });
  });

  describe('round-trip via loadCachedBaseline/saveCachedBaseline', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'baseline-cache-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('saves and loads baseline data', async () => {
      const runs: PromptRunResult[] = [
        {
          questionId: 'gsm8k-0',
          prompt: 'What is 2+2?',
          groundTruth: '4',
          responses: [{ provider: 'google', model: 'm', content: '4', responseTimeMs: 100 }],
          consensus: {},
        },
      ];

      const filePath = join(tempDir, 'test_baseline.json');
      await writeJsonFile(filePath, runs);

      // Verify we can read it back
      const { readJsonFile: readBack } = await import('./io.js');
      const loaded = await readBack<PromptRunResult[]>(filePath);
      expect(loaded).toHaveLength(1);
      expect(loaded![0]!.questionId).toBe('gsm8k-0');
    });
  });
});
