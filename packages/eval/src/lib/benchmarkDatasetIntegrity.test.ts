import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BenchmarkQuestion } from '../types.js';
import { computeSha256, checksumPath } from './datasetChecksum.js';
import { fileExists } from './io.js';

// Mock the cache path and fetch functions so we can control them
vi.mock('./benchmarkDatasetShared.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./benchmarkDatasetShared.js')>();
  return {
    ...mod,
    createCachePath: vi.fn(),
  };
});

// We need to import after mocking
const { createCachePath } = await import('./benchmarkDatasetShared.js');
const { HuggingFaceBenchmarkLoader } = await import('./huggingFaceBenchmarkLoader.js');

const mockQuestions: BenchmarkQuestion[] = [
  { id: 'q-0', prompt: 'What is 2+2?', groundTruth: '4' },
  { id: 'q-1', prompt: 'What is 3+3?', groundTruth: '6' },
];

function createLoader() {
  return new HuggingFaceBenchmarkLoader<{ question: string; answer: string }>({
    name: 'gsm8k',
    sources: [{ dataset: 'openai/gsm8k', config: 'main', split: 'test' }],
    mapRow: (row, idx) => ({
      id: `gsm8k-${idx}`,
      prompt: row.question,
      groundTruth: row.answer,
    }),
  });
}

describe('HuggingFaceBenchmarkLoader integrity checks', () => {
  let tmpDir: string;
  let cachePath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loader-integrity-'));
    cachePath = join(tmpDir, 'gsm8k.json');
    vi.mocked(createCachePath).mockReturnValue(cachePath);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('--skip-download', () => {
    it('throws when cache does not exist', async () => {
      const loader = createLoader();
      await expect(loader.load({ skipDownload: true })).rejects.toThrow(
        /not cached.*--skip-download/,
      );
    });

    it('loads from valid cache', async () => {
      const content = JSON.stringify(mockQuestions, null, 2);
      await writeFile(cachePath, content, 'utf-8');
      await writeFile(checksumPath(cachePath), computeSha256(content), 'utf-8');

      const loader = createLoader();
      const questions = await loader.load({ skipDownload: true });
      expect(questions).toEqual(mockQuestions);
    });

    it('throws when cache has checksum mismatch', async () => {
      await writeFile(cachePath, JSON.stringify(mockQuestions, null, 2), 'utf-8');
      await writeFile(checksumPath(cachePath), 'wrong_hash', 'utf-8');

      const loader = createLoader();
      await expect(loader.load({ skipDownload: true })).rejects.toThrow(
        /checksum mismatch.*--skip-download/,
      );
    });
  });

  describe('--force-download', () => {
    it('re-downloads and overwrites existing cache', async () => {
      // Pre-populate cache with stale data
      const staleContent = JSON.stringify([{ id: 'stale', prompt: 'stale', groundTruth: 'x' }]);
      await writeFile(cachePath, staleContent, 'utf-8');
      await writeFile(checksumPath(cachePath), computeSha256(staleContent), 'utf-8');

      const loader = createLoader();

      // Mock the private downloadQuestions via mocking global fetch
      const freshRows = mockQuestions.map((q, i) => ({
        row_idx: i,
        row: { question: q.prompt, answer: q.groundTruth },
      }));
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rows: freshRows, num_rows_total: freshRows.length }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const questions = await loader.load({ forceDownload: true });
      expect(questions).toHaveLength(2);
      expect(questions[0]!.id).toBe('gsm8k-0');

      // Verify new checksum was written
      const newContent = await readFile(cachePath, 'utf-8');
      const storedHash = (await readFile(checksumPath(cachePath), 'utf-8')).trim();
      expect(storedHash).toBe(computeSha256(newContent));

      vi.unstubAllGlobals();
    });
  });

  describe('checksum generation on fresh download', () => {
    it('creates sidecar checksum file alongside the cache', async () => {
      const loader = createLoader();

      const rows = mockQuestions.map((q, i) => ({
        row_idx: i,
        row: { question: q.prompt, answer: q.groundTruth },
      }));
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rows, num_rows_total: rows.length }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await loader.load();

      expect(await fileExists(cachePath)).toBe(true);
      expect(await fileExists(checksumPath(cachePath))).toBe(true);

      const content = await readFile(cachePath, 'utf-8');
      const storedHash = (await readFile(checksumPath(cachePath), 'utf-8')).trim();
      expect(storedHash).toBe(computeSha256(content));

      vi.unstubAllGlobals();
    });
  });

  describe('checksum verification on load', () => {
    it('loads valid cached data without network access', async () => {
      const content = JSON.stringify(mockQuestions, null, 2);
      await writeFile(cachePath, content, 'utf-8');
      await writeFile(checksumPath(cachePath), computeSha256(content), 'utf-8');

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const loader = createLoader();
      const questions = await loader.load();

      expect(questions).toEqual(mockQuestions);
      expect(mockFetch).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('re-downloads when checksum mismatches', async () => {
      // Write cache with wrong checksum
      await writeFile(cachePath, JSON.stringify([{ id: 'old', prompt: 'old', groundTruth: '' }]), 'utf-8');
      await writeFile(checksumPath(cachePath), 'tampered_hash', 'utf-8');

      const freshRows = mockQuestions.map((q, i) => ({
        row_idx: i,
        row: { question: q.prompt, answer: q.groundTruth },
      }));
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rows: freshRows, num_rows_total: freshRows.length }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const loader = createLoader();
      const questions = await loader.load();

      expect(mockFetch).toHaveBeenCalled();
      expect(questions).toHaveLength(2);
      expect(questions[0]!.id).toBe('gsm8k-0');

      vi.unstubAllGlobals();
    });

    it('generates checksum for legacy cache without sidecar file', async () => {
      const content = JSON.stringify(mockQuestions, null, 2);
      await writeFile(cachePath, content, 'utf-8');
      // No sidecar file

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const loader = createLoader();
      const questions = await loader.load();

      expect(questions).toEqual(mockQuestions);
      expect(mockFetch).not.toHaveBeenCalled();

      // Checksum should now be generated
      expect(await fileExists(checksumPath(cachePath))).toBe(true);
      const storedHash = (await readFile(checksumPath(cachePath), 'utf-8')).trim();
      expect(storedHash).toBe(computeSha256(content));

      vi.unstubAllGlobals();
    });
  });

  describe('sample option interaction', () => {
    it('applies sample limit after integrity check', async () => {
      const content = JSON.stringify(mockQuestions, null, 2);
      await writeFile(cachePath, content, 'utf-8');
      await writeFile(checksumPath(cachePath), computeSha256(content), 'utf-8');

      const loader = createLoader();
      const questions = await loader.load({ sample: 1 });
      expect(questions).toHaveLength(1);
      expect(questions[0]!.id).toBe('q-0');
    });
  });
});
