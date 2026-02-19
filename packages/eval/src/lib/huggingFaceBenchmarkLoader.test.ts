import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HuggingFaceBenchmarkLoader } from './huggingFaceBenchmarkLoader.js';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

function makeLoader(overrides?: {
  sources?: Array<{ dataset: string; config: string; split: string }>;
}) {
  return new HuggingFaceBenchmarkLoader<{ question: string; answer: string }>({
    name: 'gsm8k',
    sources: overrides?.sources ?? [
      { dataset: 'openai/gsm8k', config: 'main', split: 'test' },
    ],
    mapRow: (row, rowIdx) => ({
      id: `test-${rowIdx}`,
      prompt: row.question,
      groundTruth: row.answer,
    }),
  });
}

describe('HuggingFaceBenchmarkLoader', () => {
  let datasetsDir = '';
  let previousDatasetsDir: string | undefined;
  const fetchMock = vi.fn();

  beforeEach(async () => {
    datasetsDir = await mkdtemp(join(tmpdir(), 'hf-loader-test-'));
    previousDatasetsDir = process.env.ENSEMBLE_EVAL_DATASETS_DIR;
    process.env.ENSEMBLE_EVAL_DATASETS_DIR = datasetsDir;

    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();

    if (previousDatasetsDir === undefined) {
      delete process.env.ENSEMBLE_EVAL_DATASETS_DIR;
    } else {
      process.env.ENSEMBLE_EVAL_DATASETS_DIR = previousDatasetsDir;
    }

    await rm(datasetsDir, { recursive: true, force: true });
  });

  describe('successful loading', () => {
    it('fetches rows and maps them to questions', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [
            { row_idx: 0, row: { question: 'Q1', answer: 'A1' } },
            { row_idx: 1, row: { question: 'Q2', answer: 'A2' } },
          ],
          num_rows_total: 2,
        }),
      );

      const loader = makeLoader();
      const questions = await loader.load();

      expect(questions).toHaveLength(2);
      expect(questions[0]).toEqual({
        id: 'test-0',
        prompt: 'Q1',
        groundTruth: 'A1',
      });
      expect(questions[1]).toEqual({
        id: 'test-1',
        prompt: 'Q2',
        groundTruth: 'A2',
      });
    });

    it('respects sample option', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [
            { row_idx: 0, row: { question: 'Q1', answer: 'A1' } },
            { row_idx: 1, row: { question: 'Q2', answer: 'A2' } },
            { row_idx: 2, row: { question: 'Q3', answer: 'A3' } },
          ],
          num_rows_total: 3,
        }),
      );

      const loader = makeLoader();
      const questions = await loader.load({ sample: 2 });

      expect(questions).toHaveLength(2);
    });

    it('passes correct URL parameters', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
          num_rows_total: 1,
        }),
      );

      const loader = makeLoader({
        sources: [{ dataset: 'my/dataset', config: 'cfg', split: 'train' }],
      });
      await loader.load();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = new URL(String(fetchMock.mock.calls[0][0]));
      expect(url.searchParams.get('dataset')).toBe('my/dataset');
      expect(url.searchParams.get('config')).toBe('cfg');
      expect(url.searchParams.get('split')).toBe('train');
      expect(url.searchParams.get('offset')).toBe('0');
      expect(url.searchParams.get('length')).toBe('100');
    });
  });

  describe('pagination', () => {
    it('fetches multiple pages when page size is full', async () => {
      const page1Rows = Array.from({ length: 100 }, (_, i) => ({
        row_idx: i,
        row: { question: `Q${i}`, answer: `A${i}` },
      }));
      const page2Rows = [
        { row_idx: 100, row: { question: 'Q100', answer: 'A100' } },
      ];

      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ rows: page1Rows, num_rows_total: 101 }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ rows: page2Rows, num_rows_total: 101 }),
        );

      const loader = makeLoader();
      const questions = await loader.load();

      expect(questions).toHaveLength(101);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const secondUrl = new URL(String(fetchMock.mock.calls[1][0]));
      expect(secondUrl.searchParams.get('offset')).toBe('100');
    });

    it('stops when an empty page is returned', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ rows: [], num_rows_total: 0 }),
      );

      const loader = makeLoader();

      // Empty rows means 0 questions -- triggers the "returned no rows" path
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('stops paginating when num_rows_total is reached', async () => {
      const fullPage = Array.from({ length: 100 }, (_, i) => ({
        row_idx: i,
        row: { question: `Q${i}`, answer: `A${i}` },
      }));

      fetchMock.mockResolvedValueOnce(
        jsonResponse({ rows: fullPage, num_rows_total: 100 }),
      );

      const loader = makeLoader();
      const questions = await loader.load();

      expect(questions).toHaveLength(100);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('HTTP error responses', () => {
    it('throws on 403 forbidden', async () => {
      fetchMock.mockResolvedValueOnce(textResponse('Forbidden', 403));

      const loader = makeLoader();
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
    });

    it('throws on 404 not found', async () => {
      fetchMock.mockResolvedValueOnce(textResponse('Not found', 404));

      const loader = makeLoader();
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
    });

    it('throws on 500 server error', async () => {
      fetchMock.mockResolvedValueOnce(
        textResponse('Internal Server Error', 500),
      );

      const loader = makeLoader();
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
    });

    it('retries on 429 and succeeds', async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse('Rate limited', 429))
        .mockResolvedValueOnce(
          jsonResponse({
            rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
            num_rows_total: 1,
          }),
        );

      const loader = makeLoader();
      const questions = await loader.load();

      expect(questions).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }, 15_000);
  });

  describe('network error handling', () => {
    it('handles fetch rejection (network failure)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const loader = makeLoader();
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
    });

    it('handles timeout errors', async () => {
      fetchMock.mockRejectedValueOnce(
        new DOMException('signal timed out', 'TimeoutError'),
      );

      const loader = makeLoader();
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
    });
  });

  describe('malformed response handling', () => {
    it('throws when response JSON does not have rows array', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ data: 'not rows' }));

      const loader = makeLoader();
      await expect(loader.load()).rejects.toThrow('Unable to download dataset');
    });

    it('propagates mapRow errors instead of silently falling back', async () => {
      const failingLoader = new HuggingFaceBenchmarkLoader<{
        question: string;
        answer: string;
      }>({
        name: 'gsm8k',
        sources: [
          { dataset: 'source-a', config: 'main', split: 'test' },
          { dataset: 'source-b', config: 'main', split: 'test' },
        ],
        mapRow: () => {
          throw new Error('Mapping failed');
        },
      });

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [{ row_idx: 0, row: { question: 'Q', answer: 'A' } }],
          num_rows_total: 1,
        }),
      );

      // Mapping errors propagate immediately, not fall back to next source
      await expect(failingLoader.load()).rejects.toThrow('Mapping failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache behavior', () => {
    it('uses cached data on second load', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
          num_rows_total: 1,
        }),
      );

      const loader = makeLoader();

      const first = await loader.load();
      expect(first).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second load should use cache
      const second = await loader.load();
      expect(second).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('applies sample to cached data', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [
            { row_idx: 0, row: { question: 'Q1', answer: 'A1' } },
            { row_idx: 1, row: { question: 'Q2', answer: 'A2' } },
            { row_idx: 2, row: { question: 'Q3', answer: 'A3' } },
          ],
          num_rows_total: 3,
        }),
      );

      const loader = makeLoader();

      await loader.load();

      const sampled = await loader.load({ sample: 1 });
      expect(sampled).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback sources', () => {
    it('falls back to next source when first source fails', async () => {
      const loader = makeLoader({
        sources: [
          { dataset: 'primary/ds', config: 'main', split: 'test' },
          { dataset: 'fallback/ds', config: 'default', split: 'train' },
        ],
      });

      fetchMock.mockResolvedValueOnce(textResponse('Not found', 404));
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
          num_rows_total: 1,
        }),
      );

      const questions = await loader.load();
      expect(questions).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(firstUrl.searchParams.get('dataset')).toBe('primary/ds');

      const secondUrl = new URL(String(fetchMock.mock.calls[1][0]));
      expect(secondUrl.searchParams.get('dataset')).toBe('fallback/ds');
    });

    it('fails when all sources fail', async () => {
      const loader = makeLoader({
        sources: [
          { dataset: 'source-a', config: 'main', split: 'test' },
          { dataset: 'source-b', config: 'main', split: 'test' },
        ],
      });

      fetchMock
        .mockResolvedValueOnce(textResponse('Error', 500))
        .mockResolvedValueOnce(textResponse('Error', 500));

      await expect(loader.load()).rejects.toThrow(
        'Unable to download dataset gsm8k',
      );
    });

    it('includes all attempt error messages in final error', async () => {
      const loader = makeLoader({
        sources: [
          { dataset: 'source-a', config: 'cfg', split: 'test' },
          { dataset: 'source-b', config: 'cfg', split: 'test' },
        ],
      });

      fetchMock
        .mockResolvedValueOnce(textResponse('forbidden', 403))
        .mockResolvedValueOnce(textResponse('not found', 404));

      try {
        await loader.load();
        expect.unreachable('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('403');
        expect(message).toContain('404');
      }
    });
  });

  describe('zero-row source fallback', () => {
    it('falls back when source returns zero rows', async () => {
      const loader = makeLoader({
        sources: [
          { dataset: 'empty/ds', config: 'main', split: 'test' },
          { dataset: 'full/ds', config: 'main', split: 'test' },
        ],
      });

      fetchMock
        .mockResolvedValueOnce(jsonResponse({ rows: [], num_rows_total: 0 }))
        .mockResolvedValueOnce(
          jsonResponse({
            rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
            num_rows_total: 1,
          }),
        );

      const questions = await loader.load();
      expect(questions).toHaveLength(1);
    });
  });

  describe('authentication', () => {
    let previousHfToken: string | undefined;

    beforeEach(() => {
      previousHfToken = process.env.HF_TOKEN;
    });

    afterEach(() => {
      if (previousHfToken === undefined) {
        delete process.env.HF_TOKEN;
      } else {
        process.env.HF_TOKEN = previousHfToken;
      }
    });

    it('sends Authorization header when HF_TOKEN is set', async () => {
      process.env.HF_TOKEN = 'hf_test_token_123';

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
          num_rows_total: 1,
        }),
      );

      const loader = makeLoader();
      await loader.load();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).toEqual(
        expect.objectContaining({ Authorization: 'Bearer hf_test_token_123' }),
      );
    });

    it('does not send Authorization header when HF_TOKEN is not set', async () => {
      delete process.env.HF_TOKEN;

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [{ row_idx: 0, row: { question: 'Q1', answer: 'A1' } }],
          num_rows_total: 1,
        }),
      );

      const loader = makeLoader();
      await loader.load();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).toEqual({});
    });
  });

  describe('filterRow', () => {
    it('excludes rows where filterRow returns false', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          rows: [
            { row_idx: 0, row: { question: 'Q1', answer: 'A1' } },
            { row_idx: 1, row: { question: 'skip', answer: 'A2' } },
            { row_idx: 2, row: { question: 'Q3', answer: 'A3' } },
          ],
          num_rows_total: 3,
        }),
      );

      const loader = new HuggingFaceBenchmarkLoader<{ question: string; answer: string }>({
        name: 'gsm8k',
        sources: [{ dataset: 'openai/gsm8k', config: 'main', split: 'test' }],
        mapRow: (row, rowIdx) => ({
          id: `test-${rowIdx}`,
          prompt: row.question,
          groundTruth: row.answer,
        }),
        filterRow: (row) => row.question !== 'skip',
      });

      const questions = await loader.load();
      expect(questions).toHaveLength(2);
      expect(questions[0].prompt).toBe('Q1');
      expect(questions[1].prompt).toBe('Q3');
    });
  });

  describe('loader properties', () => {
    it('exposes the dataset name', () => {
      const loader = makeLoader();
      expect(loader.name).toBe('gsm8k');
    });
  });
});
