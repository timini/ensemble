import { describe, expect, it } from 'vitest';
import type { PromptRunResult } from '../types.js';
import type { DatasetResult } from './quickEvalOutput.js';
import {
  buildBaselineFromResults,
  checkRegression,
  type QuickEvalBaselineFile,
} from './quickEvalBaseline.js';

function makeDatasetResult(singleCorrect: number, ensembleCorrect: Record<string, number>, total: number): DatasetResult {
  const singleRuns: PromptRunResult[] = Array.from({ length: total }, (_, i) => ({
    prompt: `q${i}`, responses: [], consensus: {},
    evaluation: {
      evaluator: 'numeric' as const, groundTruth: '42', accuracy: 0,
      results: { 'google:m-0': { correct: i < singleCorrect, expected: '42', predicted: i < singleCorrect ? '42' : '0' } },
    },
  }));

  const ensembleRuns: PromptRunResult[] = Array.from({ length: total }, (_, i) => ({
    prompt: `q${i}`, responses: [], consensus: {},
    consensusEvaluation: {
      evaluator: 'numeric' as const, groundTruth: '42',
      results: Object.fromEntries(
        Object.entries(ensembleCorrect).map(([strategy, correct]) => [
          strategy,
          { correct: i < correct, expected: '42', predicted: i < correct ? '42' : '0' },
        ]),
      ),
    },
  }));

  return { dataset: 'gsm8k', singleRuns, ensembleRuns };
}

describe('quickEvalBaseline', () => {
  describe('buildBaselineFromResults', () => {
    it('computes accuracy from dataset results', () => {
      const dr = makeDatasetResult(7, { standard: 8, elo: 6 }, 10);
      const baseline = buildBaselineFromResults(
        'google:gemini-3-flash-preview', 3, 10, ['gsm8k'], ['standard', 'elo'], [dr],
      );

      expect(baseline.model).toBe('google:gemini-3-flash-preview');
      expect(baseline.single.accuracy).toBeCloseTo(0.7);
      expect(baseline.single.correct).toBe(7);
      expect(baseline.ensemble.standard.accuracy).toBeCloseTo(0.8);
      expect(baseline.ensemble.elo.accuracy).toBeCloseTo(0.6);
    });
  });

  describe('checkRegression', () => {
    const makeBaseline = (
      singleAcc: number,
      ensemble: Record<string, number>,
    ): QuickEvalBaselineFile => ({
      model: 'google:gemini-3-flash-preview',
      ensembleSize: 3,
      sample: 10,
      datasets: ['gsm8k'],
      strategies: Object.keys(ensemble) as ('standard' | 'elo' | 'majority')[],
      updatedAt: new Date().toISOString(),
      single: { accuracy: singleAcc, correct: Math.round(singleAcc * 10), total: 10 },
      ensemble: Object.fromEntries(
        Object.entries(ensemble).map(([k, v]) => [k, { accuracy: v, correct: Math.round(v * 10), total: 10 }]),
      ),
    });

    it('passes when accuracies improve', () => {
      const prev = makeBaseline(0.5, { standard: 0.6, elo: 0.5 });
      const curr = makeBaseline(0.6, { standard: 0.7, elo: 0.6 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      expect(result.regressions).toHaveLength(0);
    });

    it('passes when accuracies stay the same', () => {
      const prev = makeBaseline(0.5, { standard: 0.6 });
      const curr = makeBaseline(0.5, { standard: 0.6 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
    });

    it('fails when single-model accuracy drops', () => {
      const prev = makeBaseline(0.7, { standard: 0.8 });
      const curr = makeBaseline(0.5, { standard: 0.8 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(false);
      expect(result.regressions).toHaveLength(1);
      expect(result.regressions[0]!.strategy).toBe('single');
      expect(result.regressions[0]!.delta).toBeCloseTo(-0.2);
    });

    it('fails when ensemble strategy accuracy drops', () => {
      const prev = makeBaseline(0.5, { standard: 0.8, elo: 0.7 });
      const curr = makeBaseline(0.5, { standard: 0.6, elo: 0.7 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(false);
      expect(result.regressions).toHaveLength(1);
      expect(result.regressions[0]!.strategy).toBe('standard');
    });

    it('reports multiple regressions', () => {
      const prev = makeBaseline(0.7, { standard: 0.8, elo: 0.7 });
      const curr = makeBaseline(0.5, { standard: 0.6, elo: 0.5 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(false);
      expect(result.regressions).toHaveLength(3); // single + standard + elo
    });
  });
});
