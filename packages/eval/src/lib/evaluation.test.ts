import { describe, expect, it, vi } from 'vitest';
import { evaluateResponses } from './evaluation.js';
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
