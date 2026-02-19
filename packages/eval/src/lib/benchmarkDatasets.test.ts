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

  it('loads HLE from HuggingFace and filters out multimodal questions', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              question: 'What is the capital of France?',
              answer: 'Paris',
              image: '',
              question_type: 'short_answer',
              subject: 'Geography',
            },
          },
          {
            row_idx: 1,
            row: {
              question: 'Describe this image',
              answer: 'A cat',
              image: 'base64data...',
              question_type: 'short_answer',
              subject: 'Vision',
            },
          },
          {
            row_idx: 2,
            row: {
              question: 'Which option is correct? (A) X (B) Y',
              answer: 'A',
              image: '',
              question_type: 'mcq',
              subject: 'Science',
            },
          },
        ],
        num_rows_total: 3,
      }),
    );

    const loaded = await loadBenchmarkQuestions('hle', { sample: 10 });
    expect(loaded.datasetName).toBe('hle');
    // Should filter out the row with image data
    expect(loaded.questions).toHaveLength(2);
    expect(loaded.questions[0].id).toBe('hle-0');
    expect(loaded.questions[0].groundTruth).toBe('Paris');
    expect(loaded.questions[0].category).toBe('Geography');
    expect(loaded.questions[1].id).toBe('hle-2');
    expect(loaded.questions[1].category).toBe('Science');
  });

  it('loads MATH-500 from HuggingFace', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              problem: 'What is 2 + 2?',
              solution: 'The answer is $2 + 2 = \\boxed{4}$.',
              answer: '4',
              subject: 'Algebra',
              level: 1,
            },
          },
          {
            row_idx: 1,
            row: {
              problem: 'Evaluate $\\int_0^1 x^2 dx$.',
              solution: 'By the power rule, $\\int_0^1 x^2 dx = \\frac{1}{3}$.',
              answer: '\\frac{1}{3}',
              subject: 'Calculus',
              level: 3,
            },
          },
        ],
        num_rows_total: 2,
      }),
    );

    const loaded = await loadBenchmarkQuestions('math500', { sample: 10 });
    expect(loaded.datasetName).toBe('math500');
    expect(loaded.questions).toHaveLength(2);
    expect(loaded.questions[0].id).toBe('math500-0');
    expect(loaded.questions[0].prompt).toBe('What is 2 + 2?');
    expect(loaded.questions[0].groundTruth).toBe('4');
    expect(loaded.questions[0].category).toBe('Algebra');
    expect(loaded.questions[0].difficulty).toBe('1');
    expect(loaded.questions[1].id).toBe('math500-1');
    expect(loaded.questions[1].groundTruth).toBe('\\frac{1}{3}');
    expect(loaded.questions[1].difficulty).toBe('3');
  });

  it('loads MMLU-Pro from HuggingFace with 10-option MCQ', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              question_id: 1,
              question: 'What is the primary function of mitochondria?',
              options: [
                'Protein synthesis',
                'Energy production',
                'DNA replication',
                'Cell division',
                'Lipid synthesis',
                'Signal transduction',
                'Waste removal',
                'Ion transport',
                'Gene regulation',
                'Immune response',
              ],
              answer: 'B',
              answer_index: 1,
              category: 'biology',
              src: 'ori_mmlu-college_biology',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const loaded = await loadBenchmarkQuestions('mmlu_pro', { sample: 10 });
    expect(loaded.datasetName).toBe('mmlu_pro');
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].id).toBe('mmlu_pro-0');
    expect(loaded.questions[0].groundTruth).toBe('B');
    expect(loaded.questions[0].category).toBe('biology');
    expect(loaded.questions[0].prompt).toContain('A. Protein synthesis');
    expect(loaded.questions[0].prompt).toContain('J. Immune response');
    expect(loaded.questions[0].prompt).toContain('Respond with the single best option letter.');
  });

  it('loads SimpleQA from HuggingFace', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              metadata: '{"topic": "Science", "answer_type": "Person"}',
              problem: 'Who discovered penicillin?',
              answer: 'Alexander Fleming',
            },
          },
          {
            row_idx: 1,
            row: {
              metadata: '{"topic": "Geography", "answer_type": "Place"}',
              problem: 'What is the capital of Australia?',
              answer: 'Canberra',
            },
          },
        ],
        num_rows_total: 2,
      }),
    );

    const loaded = await loadBenchmarkQuestions('simpleqa', { sample: 10 });
    expect(loaded.datasetName).toBe('simpleqa');
    expect(loaded.questions).toHaveLength(2);
    expect(loaded.questions[0].id).toBe('simpleqa-0');
    expect(loaded.questions[0].prompt).toBe('Who discovered penicillin?');
    expect(loaded.questions[0].groundTruth).toBe('Alexander Fleming');
    expect(loaded.questions[0].category).toBe('Science');
    expect(loaded.questions[1].category).toBe('Geography');
  });

  it('loads ARC-Challenge from HuggingFace with MCQ', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              id: 'Mercury_7220990',
              question: 'Which factor will most likely cause a person to develop a fever?',
              choices: {
                label: ['A', 'B', 'C', 'D'],
                text: [
                  'a]viral infection',
                  'a]muscle__(injury',
                  'a][severe(bruise',
                  'a_broken)bone',
                ],
              },
              answerKey: 'A',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const loaded = await loadBenchmarkQuestions('arc', { sample: 10 });
    expect(loaded.datasetName).toBe('arc');
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].id).toBe('arc-0');
    expect(loaded.questions[0].groundTruth).toBe('A');
    expect(loaded.questions[0].prompt).toContain('Options:');
    expect(loaded.questions[0].prompt).toContain('A.');
    expect(loaded.questions[0].prompt).toContain('D.');
  });

  it('normalizes ARC numeric answer keys to letters', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              id: 'NYSEDREGENTS_2015_8_16',
              question: 'What is a property of light?',
              choices: {
                label: ['1', '2', '3', '4'],
                text: ['It bends', 'It reflects', 'It absorbs', 'It emits'],
              },
              answerKey: '2',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const loaded = await loadBenchmarkQuestions('arc', { sample: 10 });
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].groundTruth).toBe('B');
    expect(loaded.questions[0].prompt).toContain('A. It bends');
    expect(loaded.questions[0].prompt).toContain('D. It emits');
  });

  it('loads HellaSwag from HuggingFace with sentence completion', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              ctx: 'A woman is outside with a bucket and a dog.',
              endings: [
                'She puts the bucket on the ground.',
                'She washes the dog.',
                'She climbs a tree.',
                'She eats the bucket.',
              ],
              label: '1',
            },
          },
        ],
        num_rows_total: 1,
      }),
    );

    const loaded = await loadBenchmarkQuestions('hellaswag', { sample: 10 });
    expect(loaded.datasetName).toBe('hellaswag');
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].id).toBe('hellaswag-0');
    expect(loaded.questions[0].groundTruth).toBe('B');
    expect(loaded.questions[0].prompt).toContain('A woman is outside');
    expect(loaded.questions[0].prompt).toContain('A. She puts');
    expect(loaded.questions[0].prompt).toContain('D. She eats');
  });

  it('loads HalluMix from HuggingFace with hallucination detection', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          {
            row_idx: 0,
            row: {
              documents: ['The capital of France is Paris.', 'Paris has the Eiffel Tower.'],
              answer: 'The capital of France is London.',
              hallucination_label: 1,
              src: 'geography',
            },
          },
          {
            row_idx: 1,
            row: {
              documents: ['Water boils at 100 degrees Celsius.'],
              answer: 'Water boils at 100 degrees Celsius.',
              hallucination_label: 0,
              src: 'science',
            },
          },
        ],
        num_rows_total: 2,
      }),
    );

    const loaded = await loadBenchmarkQuestions('hallumix', { sample: 10 });
    expect(loaded.datasetName).toBe('hallumix');
    expect(loaded.questions).toHaveLength(2);
    expect(loaded.questions[0].id).toBe('hallumix-0');
    expect(loaded.questions[0].groundTruth).toBe('yes');
    expect(loaded.questions[0].category).toBe('geography');
    expect(loaded.questions[0].prompt).toContain('hallucination');
    expect(loaded.questions[1].groundTruth).toBe('no');
    expect(loaded.questions[1].category).toBe('science');
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
