import { describe, expect, it } from 'vitest';
import { comparePaired, exactMcNemarPValue, formatInterval, pairSingleWithStrategy } from './pairedStats.js';
import type { PromptRunResult } from '../types.js';

function pairs(spec: Array<[boolean, boolean, number]>) {
  return spec.flatMap(([a, b, n]) => Array.from({ length: n }, () => ({ modelCorrect: a, strategyCorrect: b })));
}

describe('exactMcNemarPValue', () => {
  it('is 1 with no discordant pairs', () => {
    expect(exactMcNemarPValue(0, 0)).toBe(1);
  });

  it('matches the two-sided binomial test', () => {
    // 1 vs 9 discordant: 2 * P(X <= 1 | n=10, p=0.5) = 2 * 11/1024
    expect(exactMcNemarPValue(1, 9)).toBeCloseTo(22 / 1024, 10);
    expect(exactMcNemarPValue(5, 5)).toBe(1);
  });
});

describe('comparePaired', () => {
  it('reports both accuracies with Wilson intervals and a paired McNemar test', () => {
    const result = comparePaired(pairs([[true, true, 100], [true, false, 2], [false, true, 12], [false, false, 86]]));
    expect(result.n).toBe(200);
    expect(result.baseline.accuracy).toBeCloseTo(102 / 200);
    expect(result.candidate.accuracy).toBeCloseTo(112 / 200);
    expect(result.baseline.lower).toBeLessThan(result.baseline.accuracy);
    expect(result.candidate.upper).toBeGreaterThan(result.candidate.accuracy);
    expect(result.n10).toBe(2);
    expect(result.n01).toBe(12);
    expect(result.method).toBe('exact');
    expect(result.pValue).toBeCloseTo(exactMcNemarPValue(2, 12), 10);
  });

  it('uses the chi-squared test once there are 25 or more discordant pairs', () => {
    const result = comparePaired(pairs([[true, false, 10], [false, true, 30]]));
    expect(result.method).toBe('chi-squared');
    expect(result.pValue).toBeLessThan(0.01);
  });
});

describe('pairSingleWithStrategy', () => {
  function run(id: string, single: boolean | null, strategy: boolean | null): PromptRunResult {
    return {
      questionId: id,
      prompt: id,
      responses: [],
      consensus: {},
      ...(single === null
        ? {}
        : { evaluation: { evaluator: 'mcq', groundTruth: 'A', accuracy: 0, results: { 'x:y': { correct: single, expected: 'A', predicted: 'A' } } } }),
      ...(strategy === null
        ? {}
        : { consensusEvaluation: { evaluator: 'mcq', groundTruth: 'A', results: { majority: { correct: strategy, expected: 'A', predicted: 'A' } } } }),
    };
  }

  it('pairs runs by question id and drops questions missing on either side', () => {
    const single = [run('q1', true, null), run('q2', false, null), run('q3', true, null)];
    const ensemble = [run('q2', null, true), run('q1', null, true), run('q4', null, false)];
    expect(pairSingleWithStrategy(single, ensemble, 'majority')).toEqual([
      { modelCorrect: true, strategyCorrect: true },
      { modelCorrect: false, strategyCorrect: true },
    ]);
  });
});

describe('formatInterval', () => {
  it('writes a percentage interval without dashes', () => {
    expect(formatInterval({ lower: 0.5123, upper: 0.6456 })).toBe('[51.2, 64.6]');
  });
});
