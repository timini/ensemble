import { describe, expect, it } from 'vitest';
import type { PromptRunResult } from '../types.js';
import {
  toPercent,
  toDelta,
  sumTokens,
  sumCost,
  countUnpriced,
  avgDurationMs,
  formatMs,
  computeAccuracy,
  sumStrategyMetrics,
} from './quickEvalHelpers.js';

describe('quickEvalHelpers', () => {
  describe('toPercent', () => {
    it('formats as percentage', () => {
      expect(toPercent(0.75)).toBe('75.0%');
      expect(toPercent(1)).toBe('100.0%');
      expect(toPercent(0)).toBe('0.0%');
    });
  });

  describe('toDelta', () => {
    it('adds + prefix for positive', () => {
      expect(toDelta(0.1)).toBe('+10.0%');
    });

    it('shows negative without prefix', () => {
      expect(toDelta(-0.05)).toBe('-5.0%');
    });

    it('shows zero without prefix', () => {
      expect(toDelta(0)).toBe('0.0%');
    });
  });

  describe('sumTokens', () => {
    it('sums token counts across responses', () => {
      const runs: PromptRunResult[] = [
        {
          prompt: 'q1', responses: [
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, tokenCount: 100 },
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, tokenCount: 200 },
          ], consensus: {},
        },
      ];
      expect(sumTokens(runs)).toBe(300);
    });

    it('skips error responses', () => {
      const runs: PromptRunResult[] = [
        {
          prompt: 'q1', responses: [
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, tokenCount: 100, error: 'fail' },
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, tokenCount: 50 },
          ], consensus: {},
        },
      ];
      expect(sumTokens(runs)).toBe(50);
    });
  });

  describe('sumCost', () => {
    it('sums cost across responses', () => {
      const runs: PromptRunResult[] = [
        {
          prompt: 'q1', responses: [
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, estimatedCostUsd: 0.001 },
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, estimatedCostUsd: 0.002 },
          ], consensus: {},
        },
      ];
      expect(sumCost(runs)).toBeCloseTo(0.003);
    });

    it('counts successful responses with no price separately', () => {
      const runs: PromptRunResult[] = [
        {
          prompt: 'q1', responses: [
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, estimatedCostUsd: 0 },
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0 },
            { provider: 'google', model: 'm', content: '', responseTimeMs: 0, error: 'boom' },
          ], consensus: {},
        },
      ];
      expect(countUnpriced(runs)).toBe(1);
    });
  });

  describe('avgDurationMs', () => {
    it('computes average of non-zero durations', () => {
      const runs: PromptRunResult[] = [
        { prompt: 'q1', responses: [], consensus: {}, durationMs: 100 },
        { prompt: 'q2', responses: [], consensus: {}, durationMs: 200 },
        { prompt: 'q3', responses: [], consensus: {}, durationMs: 0 },
      ];
      expect(avgDurationMs(runs)).toBe(150);
    });

    it('returns 0 for no durations', () => {
      expect(avgDurationMs([])).toBe(0);
    });
  });

  describe('formatMs', () => {
    it('formats sub-second as ms', () => {
      expect(formatMs(500)).toBe('500ms');
    });

    it('formats seconds with one decimal', () => {
      expect(formatMs(2500)).toBe('2.5s');
    });
  });

  describe('computeAccuracy', () => {
    it('computes single-model accuracy from evaluation results', () => {
      const runs: PromptRunResult[] = [
        {
          prompt: 'q1', responses: [], consensus: {},
          evaluation: {
            evaluator: 'numeric', groundTruth: '42', accuracy: 1,
            results: { 'google:m-0': { correct: true, expected: '42', predicted: '42' } },
          },
        },
        {
          prompt: 'q2', responses: [], consensus: {},
          evaluation: {
            evaluator: 'numeric', groundTruth: '7', accuracy: 0,
            results: { 'google:m-0': { correct: false, expected: '7', predicted: '5' } },
          },
        },
      ];
      const result = computeAccuracy(runs);
      expect(result.correct).toBe(1);
      expect(result.total).toBe(2);
      expect(result.accuracy).toBe(0.5);
    });

    it('computes consensus strategy accuracy', () => {
      const runs: PromptRunResult[] = [
        {
          prompt: 'q1', responses: [], consensus: {},
          consensusEvaluation: {
            evaluator: 'numeric', groundTruth: '42',
            results: {
              standard: { correct: true, expected: '42', predicted: '42' },
              elo: { correct: false, expected: '42', predicted: '10' },
            },
          },
        },
      ];
      expect(computeAccuracy(runs, 'standard').accuracy).toBe(1);
      expect(computeAccuracy(runs, 'elo').accuracy).toBe(0);
    });

    it('returns 0 accuracy for empty runs', () => {
      expect(computeAccuracy([])).toEqual({ correct: 0, total: 0, accuracy: 0, errors: 0, timeouts: 0 });
    });
  });

  describe('failures and costs', () => {
    const failed: PromptRunResult = {
      questionId: 'q1',
      prompt: 'p',
      responses: [],
      consensus: {},
      failure: 'timeout',
      evaluation: {
        evaluator: 'mcq', groundTruth: 'A', accuracy: 0,
        results: {
          'a:b': { correct: false, expected: 'A', predicted: null, failure: 'timeout' },
          'a:b#2': { correct: false, expected: 'A', predicted: null, failure: 'error' },
          'a:b#3': { correct: true, expected: 'A', predicted: 'A' },
        },
      },
      consensusEvaluation: {
        evaluator: 'mcq', groundTruth: 'A',
        results: { majority: { correct: false, expected: 'A', predicted: null, failure: 'error' } },
      },
      consensusMetrics: { majority: { tokenCount: 10, durationMs: 4, costUsd: 0.002 } },
    };

    it('counts errors and timeouts as wrong and reports them', () => {
      expect(computeAccuracy([failed])).toEqual({ correct: 1, total: 3, accuracy: 1 / 3, errors: 1, timeouts: 1 });
      expect(computeAccuracy([failed], 'majority')).toEqual({ correct: 0, total: 1, accuracy: 0, errors: 1, timeouts: 0 });
    });

    it('sums consensus costs per strategy', () => {
      expect(sumStrategyMetrics([failed, failed], 'majority')).toMatchObject({ tokenCount: 20, costUsd: 0.004 });
      expect(sumStrategyMetrics([failed], 'standard').costUsd).toBe(0);
      const unpriced = { ...failed, consensusMetrics: { majority: { tokenCount: 1, durationMs: 1 } } };
      expect(sumStrategyMetrics([failed, unpriced], 'majority')).toMatchObject({ costUsd: 0.002, unpriced: 1 });
    });
  });
});
