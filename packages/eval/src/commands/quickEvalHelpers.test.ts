import { describe, expect, it } from 'vitest';
import type { PromptRunResult } from '../types.js';
import {
  toPercent,
  toDelta,
  sumTokens,
  sumCost,
  avgDurationMs,
  formatMs,
  computeAccuracy,
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
      expect(computeAccuracy([])).toEqual({ correct: 0, total: 0, accuracy: 0 });
    });
  });
});
