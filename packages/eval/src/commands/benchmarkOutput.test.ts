import { describe, expect, it } from 'vitest';
import {
  assertValidResumedOutput,
  createBenchmarkFile,
} from './benchmarkOutput.js';

describe('benchmarkOutput', () => {
  it('creates a benchmark results file with expected metadata', () => {
    const output = createBenchmarkFile(
      'gsm8k',
      'mock',
      ['openai:gpt-4'],
      ['standard'],
      10,
    );

    expect(output).toMatchObject({
      type: 'benchmark',
      dataset: 'gsm8k',
      mode: 'mock',
      models: ['openai:gpt-4'],
      strategies: ['standard'],
      sampleSize: 10,
      runs: [],
    });
    expect(output.createdAt).toBe(output.updatedAt);
    expect(Number.isNaN(Date.parse(output.createdAt))).toBe(false);
  });

  it('accepts matching resumed output', () => {
    const resumed = createBenchmarkFile(
      'gsm8k',
      'mock',
      ['openai:gpt-4', 'anthropic:claude'],
      ['elo', 'standard'],
      3,
    );
    resumed.runs.push({
      questionId: 'gsm8k-0',
      prompt: 'Q1',
      groundTruth: '1',
      responses: [],
      consensus: {},
    });

    expect(() =>
      assertValidResumedOutput('output.json', resumed, {
        dataset: 'gsm8k',
        mode: 'mock',
        models: ['anthropic:claude', 'openai:gpt-4'],
        strategies: ['standard', 'elo'],
        sampleSize: 3,
      }),
    ).not.toThrow();
  });

  it('rejects invalid resumed files and mismatched parameters', () => {
    expect(() =>
      assertValidResumedOutput('broken.json', null, {
        dataset: 'gsm8k',
        mode: 'mock',
        models: ['openai:gpt-4'],
        strategies: ['standard'],
        sampleSize: 1,
      }),
    ).toThrow('does not contain a valid "runs" array');

    expect(() =>
      assertValidResumedOutput(
        'output.json',
        createBenchmarkFile('gsm8k', 'mock', ['openai:gpt-4'], ['standard'], 1),
        {
          dataset: 'truthfulqa',
          mode: 'mock',
          models: ['openai:gpt-4'],
          strategies: ['standard'],
          sampleSize: 1,
        },
      ),
    ).toThrow('Cannot resume benchmark with different parameters');
  });
});
