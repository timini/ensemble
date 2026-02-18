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
});
