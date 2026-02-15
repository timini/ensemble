import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadBenchmarkQuestions } from './benchmarkDatasets.js';

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('benchmark dataset loaders', () => {
  let datasetsDir = '';
  let previousDatasetsDir: string | undefined;
  const fetchMock = vi.fn();

  beforeEach(async () => {
    datasetsDir = await mkdtemp(join(tmpdir(), 'ensemble-eval-datasets-'));
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

  it('loads GSM8K from Hugging Face and uses cache on subsequent loads', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              question: 'How many apples are left?',
              answer: 'We compute carefully.\n#### 18',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const first = await loadBenchmarkQuestions('gsm8k', { sample: 1 });
    expect(first.datasetName).toBe('gsm8k');
    expect(first.questions).toHaveLength(1);
    expect(first.questions[0].id).toBe('gsm8k-0');
    expect(first.questions[0].groundTruth).toBe('18');

    const second = await loadBenchmarkQuestions('gsm8k', { sample: 1 });
    expect(second.questions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      signal: expect.any(AbortSignal),
    });
  });

  it('maps TruthfulQA MCQ rows into letter-labeled prompts', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 5,
            row: {
              question: 'Which statement is correct?',
              mc1_targets: {
                choices: ['Option one', 'Option two', 'Option three'],
                labels: [0, 1, 0],
              },
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const loaded = await loadBenchmarkQuestions('truthfulqa');
    expect(loaded.datasetName).toBe('truthfulqa');
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].id).toBe('truthfulqa-5');
    expect(loaded.questions[0].groundTruth).toBe('B');
    expect(loaded.questions[0].prompt).toContain('Options:');
    expect(loaded.questions[0].prompt).toContain('A. Option one');
    expect(loaded.questions[0].prompt).toContain('B. Option two');
  });

  it('falls back to the public GPQA mirror when official dataset is inaccessible', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('not accessible', { status: 404 }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 7,
            row: {
              problem: 'Question text\n(A) A\n(B) B\n(C) C\n(D) D',
              solution: '\\boxed{D}',
              domain: 'Physics',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const loaded = await loadBenchmarkQuestions('gpqa', { sample: 1 });
    expect(loaded.datasetName).toBe('gpqa');
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].groundTruth).toBe('D');
    expect(loaded.questions[0].category).toBe('Physics');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('dataset=Idavidrein%2Fgpqa');
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      'dataset=hendrydong%2Fgpqa_diamond_mc',
    );
  });

  it('surfaces GPQA mapping errors instead of silently falling back', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              problem: 'Question text\n(A) A\n(B) B\n(C) C\n(D) D',
              solution: 'No valid option marker',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    await expect(loadBenchmarkQuestions('gpqa', { sample: 1 })).rejects.toThrow(
      'Failed to parse GPQA answer at row 0',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loads local dataset files when alias is not provided', async () => {
    const localPath = join(datasetsDir, 'local.json');
    await writeFile(
      localPath,
      JSON.stringify([
        'What is 2 + 2?',
        { prompt: 'Choose one option', groundTruth: 'B', category: 'math' },
      ]),
      'utf-8',
    );

    const loaded = await loadBenchmarkQuestions(localPath, { sample: 2 });
    expect(loaded.datasetName).toBeNull();
    expect(loaded.questions).toHaveLength(2);
    expect(loaded.questions[0].prompt).toBe('What is 2 + 2?');
    expect(loaded.questions[1].groundTruth).toBe('B');
  });
});
