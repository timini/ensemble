import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BenchmarkQuestion, BenchmarkDatasetName } from '../types.js';
import type { GoldenBaselineFile, TierConfig } from './regressionTypes.js';

vi.mock('./benchmarkDatasetLoaders.js', () => ({
  benchmarkLoaders: {
    gsm8k: {
      name: 'gsm8k',
      load: vi.fn(),
    },
    truthfulqa: {
      name: 'truthfulqa',
      load: vi.fn(),
    },
    gpqa: {
      name: 'gpqa',
      load: vi.fn(),
    },
  },
}));

// Import after mock is set up
const { benchmarkLoaders } = await import('./benchmarkDatasetLoaders.js');
const { loadPinnedQuestions, pinQuestionsForBaseline } = await import(
  './questionPinning.js'
);

const gsm8kLoader = benchmarkLoaders.gsm8k as unknown as {
  load: ReturnType<typeof vi.fn>;
};
const truthfulqaLoader = benchmarkLoaders.truthfulqa as unknown as {
  load: ReturnType<typeof vi.fn>;
};
const gpqaLoader = benchmarkLoaders.gpqa as unknown as {
  load: ReturnType<typeof vi.fn>;
};

function makeQuestion(
  dataset: BenchmarkDatasetName,
  index: number,
): BenchmarkQuestion {
  return {
    id: `${dataset}-${index}`,
    prompt: `Question ${index} from ${dataset}`,
    groundTruth: `answer-${index}`,
  };
}

function makeBaseline(overrides?: Partial<GoldenBaselineFile>): GoldenBaselineFile {
  return {
    tier: 'ci',
    createdAt: '2026-01-01T00:00:00Z',
    commitSha: 'abc123',
    config: {
      name: 'ci',
      datasets: [{ name: 'gsm8k', sampleSize: 2 }],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    },
    questionIds: ['gsm8k-0', 'gsm8k-3'],
    results: [
      {
        questionId: 'gsm8k-0',
        dataset: 'gsm8k',
        groundTruth: 'answer-0',
        modelResults: {},
        consensusResults: {},
      },
      {
        questionId: 'gsm8k-3',
        dataset: 'gsm8k',
        groundTruth: 'answer-3',
        modelResults: {},
        consensusResults: {},
      },
    ],
    ...overrides,
  };
}

describe('loadPinnedQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exact questions matching baseline IDs', async () => {
    const allGsm8k = Array.from({ length: 10 }, (_, i) => makeQuestion('gsm8k', i));
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const baseline = makeBaseline();
    const result = await loadPinnedQuestions(baseline);

    expect(result.size).toBe(1);
    const gsm8kQuestions = result.get('gsm8k')!;
    expect(gsm8kQuestions).toHaveLength(2);
    expect(gsm8kQuestions.map((q) => q.id)).toEqual(['gsm8k-0', 'gsm8k-3']);
    expect(gsm8kQuestions[0]).toEqual(allGsm8k[0]);
    expect(gsm8kQuestions[1]).toEqual(allGsm8k[3]);
  });

  it('loads questions from multiple datasets', async () => {
    const allGsm8k = Array.from({ length: 5 }, (_, i) => makeQuestion('gsm8k', i));
    const allTruthful = Array.from({ length: 5 }, (_, i) =>
      makeQuestion('truthfulqa', i),
    );
    gsm8kLoader.load.mockResolvedValue(allGsm8k);
    truthfulqaLoader.load.mockResolvedValue(allTruthful);

    const baseline = makeBaseline({
      questionIds: ['gsm8k-1', 'truthfulqa-2', 'truthfulqa-4'],
      results: [
        {
          questionId: 'gsm8k-1',
          dataset: 'gsm8k',
          groundTruth: 'answer-1',
          modelResults: {},
          consensusResults: {},
        },
        {
          questionId: 'truthfulqa-2',
          dataset: 'truthfulqa',
          groundTruth: 'answer-2',
          modelResults: {},
          consensusResults: {},
        },
        {
          questionId: 'truthfulqa-4',
          dataset: 'truthfulqa',
          groundTruth: 'answer-4',
          modelResults: {},
          consensusResults: {},
        },
      ],
    });

    const result = await loadPinnedQuestions(baseline);

    expect(result.size).toBe(2);
    expect(result.get('gsm8k')!.map((q) => q.id)).toEqual(['gsm8k-1']);
    expect(result.get('truthfulqa')!.map((q) => q.id)).toEqual([
      'truthfulqa-2',
      'truthfulqa-4',
    ]);
  });

  it('throws error if pinned question ID not found in dataset', async () => {
    const allGsm8k = [makeQuestion('gsm8k', 0), makeQuestion('gsm8k', 1)];
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const baseline = makeBaseline({
      questionIds: ['gsm8k-0', 'gsm8k-99'],
      results: [
        {
          questionId: 'gsm8k-0',
          dataset: 'gsm8k',
          groundTruth: 'answer-0',
          modelResults: {},
          consensusResults: {},
        },
        {
          questionId: 'gsm8k-99',
          dataset: 'gsm8k',
          groundTruth: 'answer-99',
          modelResults: {},
          consensusResults: {},
        },
      ],
    });

    await expect(loadPinnedQuestions(baseline)).rejects.toThrow(
      /pinned question IDs not found.*gsm8k-99/i,
    );
  });

  it('throws error listing all missing IDs when multiple are missing', async () => {
    const allGsm8k = [makeQuestion('gsm8k', 0)];
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const baseline = makeBaseline({
      questionIds: ['gsm8k-0', 'gsm8k-50', 'gsm8k-99'],
      results: [
        {
          questionId: 'gsm8k-0',
          dataset: 'gsm8k',
          groundTruth: 'answer-0',
          modelResults: {},
          consensusResults: {},
        },
        {
          questionId: 'gsm8k-50',
          dataset: 'gsm8k',
          groundTruth: 'answer-50',
          modelResults: {},
          consensusResults: {},
        },
        {
          questionId: 'gsm8k-99',
          dataset: 'gsm8k',
          groundTruth: 'answer-99',
          modelResults: {},
          consensusResults: {},
        },
      ],
    });

    await expect(loadPinnedQuestions(baseline)).rejects.toThrow(/gsm8k-50/);
    await expect(loadPinnedQuestions(baseline)).rejects.toThrow(/gsm8k-99/);
  });
});

describe('pinQuestionsForBaseline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('samples correct count per dataset', async () => {
    const allGsm8k = Array.from({ length: 20 }, (_, i) => makeQuestion('gsm8k', i));
    const allTruthful = Array.from({ length: 20 }, (_, i) =>
      makeQuestion('truthfulqa', i),
    );
    gsm8kLoader.load.mockResolvedValue(allGsm8k);
    truthfulqaLoader.load.mockResolvedValue(allTruthful);

    const config: TierConfig = {
      name: 'ci',
      datasets: [
        { name: 'gsm8k', sampleSize: 5 },
        { name: 'truthfulqa', sampleSize: 3 },
      ],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    };

    const result = await pinQuestionsForBaseline(config);

    expect(result.size).toBe(2);
    expect(result.get('gsm8k')!).toHaveLength(5);
    expect(result.get('truthfulqa')!).toHaveLength(3);
  });

  it('returns valid BenchmarkQuestion objects', async () => {
    const allGsm8k = Array.from({ length: 10 }, (_, i) => makeQuestion('gsm8k', i));
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const config: TierConfig = {
      name: 'ci',
      datasets: [{ name: 'gsm8k', sampleSize: 3 }],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    };

    const result = await pinQuestionsForBaseline(config);
    const questions = result.get('gsm8k')!;

    for (const q of questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('prompt');
      expect(q).toHaveProperty('groundTruth');
      expect(typeof q.id).toBe('string');
      expect(typeof q.prompt).toBe('string');
      expect(typeof q.groundTruth).toBe('string');
      expect(q.id.length).toBeGreaterThan(0);
    }
  });

  it('returns unique questions (no duplicates)', async () => {
    const allGsm8k = Array.from({ length: 10 }, (_, i) => makeQuestion('gsm8k', i));
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const config: TierConfig = {
      name: 'ci',
      datasets: [{ name: 'gsm8k', sampleSize: 5 }],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    };

    const result = await pinQuestionsForBaseline(config);
    const questions = result.get('gsm8k')!;
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sampling with a seed is deterministic', async () => {
    const allGsm8k = Array.from({ length: 50 }, (_, i) => makeQuestion('gsm8k', i));
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const config: TierConfig = {
      name: 'ci',
      datasets: [{ name: 'gsm8k', sampleSize: 10 }],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    };

    const result1 = await pinQuestionsForBaseline(config, 42);
    gsm8kLoader.load.mockResolvedValue(allGsm8k);
    const result2 = await pinQuestionsForBaseline(config, 42);

    expect(result1.get('gsm8k')!.map((q) => q.id)).toEqual(
      result2.get('gsm8k')!.map((q) => q.id),
    );
  });

  it('different seeds produce different samples', async () => {
    const allGsm8k = Array.from({ length: 50 }, (_, i) => makeQuestion('gsm8k', i));
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const config: TierConfig = {
      name: 'ci',
      datasets: [{ name: 'gsm8k', sampleSize: 10 }],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    };

    const result1 = await pinQuestionsForBaseline(config, 42);
    gsm8kLoader.load.mockResolvedValue(allGsm8k);
    const result2 = await pinQuestionsForBaseline(config, 99);

    const ids1 = result1.get('gsm8k')!.map((q) => q.id);
    const ids2 = result2.get('gsm8k')!.map((q) => q.id);
    // With 50 questions and sample of 10, different seeds should produce different orderings
    expect(ids1).not.toEqual(ids2);
  });

  it('clamps sampleSize when it exceeds available questions', async () => {
    const allGsm8k = Array.from({ length: 3 }, (_, i) => makeQuestion('gsm8k', i));
    gsm8kLoader.load.mockResolvedValue(allGsm8k);

    const config: TierConfig = {
      name: 'ci',
      datasets: [{ name: 'gsm8k', sampleSize: 100 }],
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      runs: 1,
      requestDelayMs: 0,
      significanceThreshold: 0.05,
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    };

    const result = await pinQuestionsForBaseline(config);
    expect(result.get('gsm8k')!).toHaveLength(3);
  });
});
