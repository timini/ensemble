import { describe, expect, it, vi } from 'vitest';
import { evaluateConsensusStrategies, evaluateResponses } from './evaluation.js';
import type { ProviderResponse } from '../types.js';

describe('evaluateResponses', () => {
  const responses: ProviderResponse[] = [
    {
      provider: 'openai',
      model: 'gpt-4',
      content: 'first',
      responseTimeMs: 10,
    },
    {
      provider: 'anthropic',
      model: 'claude',
      content: 'errored',
      responseTimeMs: 12,
      error: 'rate limit',
    },
    {
      provider: 'openai',
      model: 'gpt-4',
      content: 'second',
      responseTimeMs: 14,
    },
  ];

  it('returns undefined when evaluator is null or ground truth is empty', async () => {
    await expect(evaluateResponses(null, responses, 'answer')).resolves.toBeUndefined();
    await expect(
      evaluateResponses(
        {
          name: 'numeric',
          evaluate: () => ({ correct: true, expected: 'x', predicted: 'x' }),
        },
        responses,
        '',
      ),
    ).resolves.toBeUndefined();
  });

  it('skips errored responses, tracks duplicate keys by occurrence, and computes accuracy', async () => {
    const evaluator = {
      name: 'numeric' as const,
      evaluate: vi.fn((response: string) =>
        Promise.resolve({
          correct: response === 'first',
          expected: 'answer',
          predicted: response,
        }),
      ),
    };

    const result = await evaluateResponses(evaluator, responses, 'answer', 'prompt text');

    expect(result).toMatchObject({
      evaluator: 'numeric',
      groundTruth: 'answer',
      accuracy: 0.5,
    });
    expect(result?.results).toEqual({
      'openai:gpt-4': { correct: true, expected: 'answer', predicted: 'first' },
      'openai:gpt-4#2': { correct: false, expected: 'answer', predicted: 'second' },
    });
    expect(evaluator.evaluate).toHaveBeenNthCalledWith(
      1,
      'first',
      'answer',
      'prompt text',
    );
    expect(evaluator.evaluate).toHaveBeenNthCalledWith(
      2,
      'second',
      'answer',
      'prompt text',
    );
  });
});

describe('evaluateConsensusStrategies', () => {
  it('returns undefined when evaluator is null or ground truth is empty', async () => {
    await expect(
      evaluateConsensusStrategies(null, { standard: 'answer' }, 'truth'),
    ).resolves.toBeUndefined();
    await expect(
      evaluateConsensusStrategies(
        { name: 'numeric', evaluate: () => ({ correct: true, expected: 'x', predicted: 'x' }) },
        { standard: 'answer' },
        '',
      ),
    ).resolves.toBeUndefined();
  });

  it('evaluates each strategy against ground truth', async () => {
    const evaluator = {
      name: 'numeric' as const,
      evaluate: vi.fn((response: string, groundTruth: string) =>
        Promise.resolve({
          correct: response === groundTruth,
          expected: groundTruth,
          predicted: response,
        }),
      ),
    };

    const result = await evaluateConsensusStrategies(
      evaluator,
      { standard: '42', majority: '99' },
      '42',
      'prompt text',
    );

    expect(result).toEqual({
      evaluator: 'numeric',
      groundTruth: '42',
      results: {
        standard: { correct: true, expected: '42', predicted: '42' },
        majority: { correct: false, expected: '42', predicted: '99' },
      },
    });
    expect(evaluator.evaluate).toHaveBeenCalledTimes(2);
    expect(evaluator.evaluate).toHaveBeenCalledWith('42', '42', 'prompt text');
    expect(evaluator.evaluate).toHaveBeenCalledWith('99', '42', 'prompt text');
  });

  it('skips consensus entries that are error strings', async () => {
    const evaluator = {
      name: 'numeric' as const,
      evaluate: vi.fn(() => ({ correct: false, expected: '42', predicted: '3' })),
    };

    const result = await evaluateConsensusStrategies(
      evaluator,
      {
        standard: '42',
        elo: 'ELO strategy requires at least 3 successful model responses.',
        majority: 'Majority strategy requires at least 2 successful model responses.',
      },
      '42',
    );

    // Only standard should be evaluated; error strings should be skipped
    expect(evaluator.evaluate).toHaveBeenCalledTimes(1);
    expect(result?.results.standard).toBeDefined();
    expect(result?.results.elo).toBeUndefined();
    expect(result?.results.majority).toBeUndefined();
  });

  it('skips empty consensus entries', async () => {
    const evaluator = {
      name: 'mcq' as const,
      evaluate: vi.fn(() => ({ correct: true, expected: 'A', predicted: 'A' })),
    };

    const result = await evaluateConsensusStrategies(
      evaluator,
      { standard: 'A' },
      'A',
    );

    expect(result?.results).toEqual({
      standard: { correct: true, expected: 'A', predicted: 'A' },
    });
    expect(evaluator.evaluate).toHaveBeenCalledTimes(1);
  });
});
