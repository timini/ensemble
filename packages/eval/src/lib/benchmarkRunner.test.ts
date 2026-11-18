import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  AIProvider,
  ProviderRegistry,
} from '@ensemble-ai/shared-utils/providers';
import { afterEach, describe, expect, it } from 'vitest';
import { createBenchmarkFile } from '../commands/benchmarkOutput.js';
import { BenchmarkRunner } from './benchmarkRunner.js';
import { MechanicalEvaluator } from './evaluators.js';

function buildProvider(): AIProvider {
  return {
    streamResponse: async (prompt, _model, _onChunk, onComplete) => {
      onComplete(`echo:${prompt}`, 10, 100);
    },
    generateStructured: async () => ({ parsed: {} as never, raw: '{}', responseTimeMs: 0 }),
    generateEmbeddings: async () => [],
    validateApiKey: async () => ({ valid: true }),
    listAvailableModels: () => [
      {
        id: 'gpt-4o',
        name: 'gpt-4o',
        provider: 'openai',
        contextWindow: 128_000,
        costPer1kTokens: 0.01,
      },
    ],
    listAvailableTextModels: async () => ['gpt-4o'],
  };
}

function buildRegistry(provider: AIProvider): ProviderRegistry {
  return {
    getProvider: () => provider,
  } as unknown as ProviderRegistry;
}

describe('BenchmarkRunner', () => {
  let scratchDir = '';

  afterEach(async () => {
    if (scratchDir) {
      await rm(scratchDir, { recursive: true, force: true });
    }
  });

  it('supports resume-style skipping and persists checkpoint updates', async () => {
    scratchDir = await mkdtemp(join(tmpdir(), 'ensemble-benchmark-runner-'));
    const outputPath = join(scratchDir, 'benchmark.json');
    const output = createBenchmarkFile(
      'gsm8k',
      'mock',
      ['openai:gpt-4o'],
      ['standard'],
      2,
    );
    output.runs.push({
      questionId: 'q1',
      prompt: 'Question 1',
      groundTruth: 'echo:Question 1',
      responses: [],
      consensus: {},
    });

    const events: Array<{ questionId: string; skipped: boolean }> = [];
    const runner = new BenchmarkRunner({
      mode: 'mock',
      registry: buildRegistry(buildProvider()),
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      evaluator: {
        name: 'generative',
        evaluate: async (response, groundTruth) => ({
          correct: response === groundTruth,
          predicted: response,
          expected: groundTruth,
        }),
      },
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    });

    await runner.run({
      questions: [
        { id: 'q1', prompt: 'Question 1', groundTruth: 'echo:Question 1' },
        { id: 'q2', prompt: 'Question 2', groundTruth: 'echo:Question 2' },
      ],
      output,
      outputPath,
      onProgress: (progress) => {
        events.push({ questionId: progress.questionId, skipped: progress.skipped });
      },
    });

    expect(events).toEqual([
      { questionId: 'q1', skipped: true },
      { questionId: 'q2', skipped: false },
    ]);
    expect(output.runs).toHaveLength(2);
    expect(output.runs[1]).toMatchObject({
      questionId: 'q2',
      prompt: 'Question 2',
    });

    const persisted = JSON.parse(await readFile(outputPath, 'utf-8')) as {
      runs: Array<{ questionId: string }>;
    };
    expect(persisted.runs).toHaveLength(2);
    expect(persisted.runs[1].questionId).toBe('q2');
  });

  it('populates consensusEvaluation when evaluator and groundTruth are present', async () => {
    scratchDir = await mkdtemp(join(tmpdir(), 'ensemble-benchmark-consensus-'));
    const outputPath = join(scratchDir, 'benchmark.json');
    const output = createBenchmarkFile(
      'gsm8k',
      'mock',
      ['openai:gpt-4o'],
      ['standard'],
      1,
    );

    const runner = new BenchmarkRunner({
      mode: 'mock',
      registry: buildRegistry(buildProvider()),
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      evaluator: {
        name: 'generative',
        evaluate: async (response, groundTruth) => ({
          correct: response === groundTruth,
          predicted: response,
          expected: groundTruth,
        }),
      },
      summarizer: { provider: 'openai', model: 'gpt-4o' },
    });

    await runner.run({
      questions: [
        { id: 'q1', prompt: 'What is 2+2?', groundTruth: '4' },
      ],
      output,
      outputPath,
    });

    expect(output.runs).toHaveLength(1);
    const run = output.runs[0];
    expect(run.consensusEvaluation).toBeDefined();
    expect(run.consensusEvaluation?.evaluator).toBe('generative');
    expect(run.consensusEvaluation?.groundTruth).toBe('4');
    expect(run.consensusEvaluation?.results.standard).toBeDefined();
    expect(run.consensusEvaluation?.results.standard?.expected).toBe('4');
  });

  it('records a timed-out question as wrong for every model and strategy', async () => {
    const slow: AIProvider = {
      ...buildProvider(),
      streamResponse: () => new Promise(() => {}),
    };
    const output = createBenchmarkFile('truthfulqa', 'mock', ['openai:gpt-4o'], ['standard', 'majority'], 1);
    const runner = new BenchmarkRunner({
      mode: 'mock',
      registry: buildRegistry(slow),
      models: [{ provider: 'openai', model: 'gpt-4o' }, { provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard', 'majority'],
      evaluator: new MechanicalEvaluator('choice'),
      summarizer: null,
      parallelQuestions: true,
      questionTimeoutMs: 20,
    });

    await runner.run({
      questions: [{ id: 'q1', prompt: 'Q', groundTruth: 'A' }],
      output,
      outputPath: '/dev/null',
    });

    expect(output.runs).toHaveLength(1);
    const run = output.runs[0];
    expect(run.failure).toBe('timeout');
    expect(run.responses).toHaveLength(2);
    expect(Object.values(run.evaluation!.results)).toHaveLength(2);
    for (const result of Object.values(run.evaluation!.results)) {
      expect(result).toMatchObject({ correct: false, failure: 'timeout' });
    }
    expect(run.consensusEvaluation?.results.standard).toMatchObject({ correct: false, failure: 'timeout' });
    expect(run.consensusEvaluation?.results.majority).toMatchObject({ correct: false, failure: 'timeout' });
  });

  it('records a question that throws as an error in sequential mode', async () => {
    const broken = { getProvider: () => { throw new Error('no client'); } } as unknown as ProviderRegistry;
    const output = createBenchmarkFile('gsm8k', 'mock', ['openai:gpt-4o'], ['standard'], 1);
    const runner = new BenchmarkRunner({
      mode: 'mock',
      registry: broken,
      models: [{ provider: 'openai', model: 'gpt-4o' }],
      strategies: ['standard'],
      evaluator: new MechanicalEvaluator('numeric'),
      summarizer: null,
    });
    await runner.run({ questions: [{ id: 'q1', prompt: 'Q', groundTruth: '4' }], output, outputPath: '/dev/null' });
    expect(output.runs[0].failure).toBe('error');
    expect(output.runs[0].evaluation?.results['openai:gpt-4o']).toMatchObject({ correct: false, failure: 'error' });
  });

  it('asks for structured answers and votes mechanically on a structured run', async () => {
    const answers = ['B', 'B', 'C'];
    let call = 0;
    const provider: AIProvider = {
      ...buildProvider(),
      generateStructured: async () => ({
        parsed: { reasoning: 'r', answer: answers[call++ % 3] } as never,
        raw: '',
        responseTimeMs: 1,
      }),
    };
    const output = createBenchmarkFile('arc', 'mock', ['openai:gpt-4o'], ['majority'], 1);
    const runner = new BenchmarkRunner({
      mode: 'mock',
      registry: buildRegistry(provider),
      models: Array.from({ length: 3 }, () => ({ provider: 'openai' as const, model: 'gpt-4o' })),
      strategies: ['majority'],
      evaluator: new MechanicalEvaluator('choice'),
      summarizer: { provider: 'openai', model: 'gpt-4o' },
      protocol: 'structured',
    });
    await runner.run({
      questions: [
        {
          id: 'q1', prompt: 'Q', groundTruth: 'B', answer: { kind: 'choice', choices: ['A', 'B', 'C', 'D'] },
          optionPermutation: [2, 0, 1, 3], optionSeed: 1729,
        },
      ],
      output,
      outputPath: '/dev/null',
    });
    const run = output.runs[0];
    expect(run.answerProtocol).toBe('structured');
    expect(run.optionPermutation).toEqual([2, 0, 1, 3]);
    expect(run.responses.every((r) => r.answerSource === 'structured')).toBe(true);
    expect(run.consensus.majority).toBe('Final answer: B');
    expect(run.consensusMetrics?.majority).toMatchObject({ mechanical: true, tokenCount: 0, costUsd: 0 });
    expect(run.consensusEvaluation?.results.majority?.correct).toBe(true);
    expect(run.evaluation?.accuracy).toBeCloseTo(2 / 3);
  });
  it('scores an unreadable mechanical vote wrong without counting it as an error', async () => {
    const provider: AIProvider = {
      ...buildProvider(),
      generateStructured: async () => ({
        parsed: { reasoning: 'r', answer: 'not sure' } as never,
        raw: '',
        responseTimeMs: 1,
      }),
    };
    const output = createBenchmarkFile('gsm8k', 'mock', ['openai:gpt-4o'], ['majority'], 1);
    const runner = new BenchmarkRunner({
      mode: 'mock',
      registry: buildRegistry(provider),
      models: Array.from({ length: 3 }, () => ({ provider: 'openai' as const, model: 'gpt-4o' })),
      strategies: ['majority'],
      evaluator: new MechanicalEvaluator('numeric'),
      summarizer: null,
      protocol: 'structured',
    });
    await runner.run({
      questions: [{ id: 'q1', prompt: 'Q', groundTruth: '4', answer: { kind: 'numeric' } }],
      output,
      outputPath: '/dev/null',
    });
    const majority = output.runs[0].consensusEvaluation?.results.majority;
    expect(majority).toMatchObject({ correct: false, predicted: null });
    expect(majority?.failure).toBeUndefined();
  });
});
