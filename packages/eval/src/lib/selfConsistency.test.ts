import { describe, expect, it } from 'vitest';
import { buildSelfConsistencyResult } from './selfConsistency.js';

describe('buildSelfConsistencyResult', () => {
  it('returns undefined when run count is 1', () => {
    expect(
      buildSelfConsistencyResult({
        runCount: 1,
        responses: [],
      }),
    ).toBeUndefined();
  });

  it('builds majority vote from evaluator predictions', () => {
    const result = buildSelfConsistencyResult({
      runCount: 5,
      responses: [],
      evaluation: {
        evaluator: 'mcq',
        groundTruth: 'B',
        accuracy: 0.6,
        results: {
          a: { correct: true, expected: 'B', predicted: 'B' },
          b: { correct: false, expected: 'B', predicted: 'A' },
          c: { correct: true, expected: 'B', predicted: 'B' },
        },
      },
    });

    expect(result).toEqual({
      runs: 5,
      majorityAnswer: 'B',
      majorityCount: 2,
      correct: true,
    });
  });

  it('falls back to successful response content when evaluation is unavailable', () => {
    const result = buildSelfConsistencyResult({
      runCount: 3,
      responses: [
        {
          provider: 'openai',
          model: 'gpt-4o',
          content: '42',
          responseTimeMs: 12,
        },
        {
          provider: 'openai',
          model: 'gpt-4o',
          content: '42',
          responseTimeMs: 14,
        },
        {
          provider: 'openai',
          model: 'gpt-4o',
          content: '',
          responseTimeMs: 0,
          error: 'timeout',
        },
      ],
    });

    expect(result).toEqual({
      runs: 3,
      majorityAnswer: '42',
      majorityCount: 2,
      correct: null,
    });
  });
});
