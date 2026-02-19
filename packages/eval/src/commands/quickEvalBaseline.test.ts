import { describe, expect, it } from 'vitest';
import type { PromptRunResult } from '../types.js';
import type { DatasetResult } from './quickEvalOutput.js';
import {
  buildBaselineFromResults,
  checkRegression,
  type QuickEvalBaselineFile,
  type StrategyCheckResult,
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
        'google:gemini-2.5-flash', 3, 10, ['gsm8k'], ['standard', 'elo'], [dr],
      );

      expect(baseline.model).toBe('google:gemini-2.5-flash');
      expect(baseline.single.accuracy).toBeCloseTo(0.7);
      expect(baseline.single.correct).toBe(7);
      expect(baseline.ensemble.standard.accuracy).toBeCloseTo(0.8);
      expect(baseline.ensemble.elo.accuracy).toBeCloseTo(0.6);
    });
  });

  describe('checkRegression', () => {
    const makeBaseline = (
      singleCorrect: number,
      singleTotal: number,
      ensemble: Record<string, { correct: number; total: number }>,
    ): QuickEvalBaselineFile => ({
      model: 'google:gemini-2.5-flash',
      ensembleSize: 3,
      sample: 10,
      datasets: ['gsm8k'],
      strategies: Object.keys(ensemble) as ('standard' | 'elo' | 'majority' | 'council')[],
      updatedAt: new Date().toISOString(),
      single: { accuracy: singleCorrect / singleTotal, correct: singleCorrect, total: singleTotal },
      ensemble: Object.fromEntries(
        Object.entries(ensemble).map(([k, v]) => [k, { accuracy: v.correct / v.total, correct: v.correct, total: v.total }]),
      ),
    });

    /** Shorthand: same total for all */
    const makeSimple = (
      singleCorrect: number,
      ensemble: Record<string, number>,
      total = 30,
    ): QuickEvalBaselineFile => makeBaseline(
      singleCorrect, total,
      Object.fromEntries(Object.entries(ensemble).map(([k, v]) => [k, { correct: v, total }])),
    );

    it('passes when accuracies improve', () => {
      const prev = makeSimple(15, { standard: 18, elo: 15 });
      const curr = makeSimple(18, { standard: 21, elo: 18 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      // Improvements should have p > 0.5 (lower tail tests for decrease)
      for (const r of result.results) {
        expect(r.pValue).toBeGreaterThan(0.5);
        expect(r.significant).toBe(false);
      }
    });

    it('passes when accuracies stay the same', () => {
      const prev = makeSimple(15, { standard: 18 });
      const curr = makeSimple(15, { standard: 18 });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      for (const r of result.results) {
        expect(r.pValue).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('passes when small drop is not statistically significant', () => {
      // 7/10 → 5/10 on a small sample: Fisher p ≈ 0.28, not significant
      const prev = makeBaseline(7, 10, { standard: { correct: 8, total: 10 } });
      const curr = makeBaseline(5, 10, { standard: { correct: 6, total: 10 } });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      const singleResult = result.results.find((r) => r.strategy === 'single')!;
      expect(singleResult.pValue).toBeGreaterThan(0.10);
      expect(singleResult.significant).toBe(false);
    });

    it('fails with extreme drop that is statistically significant', () => {
      // 10/10 → 3/10: Fisher p ≈ 0.003, highly significant
      const prev = makeBaseline(10, 10, { standard: { correct: 10, total: 10 } });
      const curr = makeBaseline(3, 10, { standard: { correct: 3, total: 10 } });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(false);
      const singleResult = result.results.find((r) => r.strategy === 'single')!;
      expect(singleResult.pValue).toBeLessThan(0.01);
      expect(singleResult.significant).toBe(true);
      expect(singleResult.delta).toBeLessThan(0);
    });

    it('reports results for ALL strategies, not just regressions', () => {
      const prev = makeSimple(20, { standard: 22, elo: 18 });
      const curr = makeSimple(20, { standard: 22, elo: 18 });
      const result = checkRegression(prev, curr);
      // Should have single + standard + elo = 3 results
      expect(result.results).toHaveLength(3);
      expect(result.results.map((r) => r.strategy)).toEqual(['single', 'standard', 'elo']);
    });

    it('verifies p-values match known Fisher exact results', () => {
      // Textbook case: 8/10 → 3/10
      // Fisher's exact (one-sided lower) p ≈ 0.035
      const prev = makeBaseline(8, 10, {});
      const curr = makeBaseline(3, 10, {});
      const result = checkRegression(prev, curr);
      const singleResult = result.results.find((r) => r.strategy === 'single')!;
      expect(singleResult.pValue).toBeCloseTo(0.035, 2);
    });

    it('verifies Holm-Bonferroni corrected p-values >= raw p-values', () => {
      const prev = makeSimple(20, { standard: 22, elo: 20, majority: 25 });
      const curr = makeSimple(15, { standard: 17, elo: 15, majority: 20 });
      const result = checkRegression(prev, curr);
      for (const r of result.results) {
        expect(r.correctedPValue).toBeGreaterThanOrEqual(r.pValue - 1e-10);
      }
    });

    it('verifies Wilson CIs bracket the current accuracy', () => {
      const prev = makeSimple(20, { standard: 22 });
      const curr = makeSimple(18, { standard: 20 });
      const result = checkRegression(prev, curr);
      for (const r of result.results) {
        expect(r.wilsonCI.lower).toBeLessThanOrEqual(r.currentAccuracy);
        expect(r.wilsonCI.upper).toBeGreaterThanOrEqual(r.currentAccuracy);
      }
    });

    it('fails with lower alpha when p-value falls below it', () => {
      // 10/10 → 4/10: Fisher p ≈ 0.01, significant even at alpha=0.02
      const prev = makeBaseline(10, 10, { standard: { correct: 10, total: 10 } });
      const curr = makeBaseline(4, 10, { standard: { correct: 4, total: 10 } });

      // Should pass at very strict alpha
      const resultStrict = checkRegression(prev, curr, 0.001);
      expect(resultStrict.passed).toBe(true);
      expect(resultStrict.significanceLevel).toBe(0.001);

      // Should fail at alpha = 0.05
      const resultRelaxed = checkRegression(prev, curr, 0.05);
      expect(resultRelaxed.passed).toBe(false);
      expect(resultRelaxed.significanceLevel).toBe(0.05);
    });

    it('handles identical counts (p >= 0.5)', () => {
      const prev = makeBaseline(5, 10, { standard: { correct: 5, total: 10 } });
      const curr = makeBaseline(5, 10, { standard: { correct: 5, total: 10 } });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      for (const r of result.results) {
        expect(r.pValue).toBeGreaterThanOrEqual(0.5);
        expect(r.delta).toBe(0);
      }
    });

    it('handles zero totals gracefully', () => {
      const prev = makeBaseline(0, 0, { standard: { correct: 0, total: 0 } });
      const curr = makeBaseline(0, 0, { standard: { correct: 0, total: 0 } });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      for (const r of result.results) {
        expect(r.pValue).toBe(1);
        expect(r.currentAccuracy).toBe(0);
        expect(r.baselineAccuracy).toBe(0);
      }
    });

    it('computes lift over single for ensemble strategies', () => {
      // Baseline: single=15/30=50%, standard=21/30=70% → lift=+20%
      // Current: single=12/30=40%, standard=19/30≈63.3% → lift≈+23.3%
      const prev = makeBaseline(15, 30, { standard: { correct: 21, total: 30 } });
      const curr = makeBaseline(12, 30, { standard: { correct: 19, total: 30 } });
      const result = checkRegression(prev, curr);
      const stdResult = result.results.find((r) => r.strategy === 'standard')!;
      expect(stdResult.baselineLift).toBeCloseTo(0.2); // 70% - 50%
      expect(stdResult.currentLift).toBeCloseTo(19 / 30 - 12 / 30); // ≈23.3%
      expect(stdResult.liftChange).toBeCloseTo(stdResult.currentLift! - stdResult.baselineLift!);

      const singleResult = result.results.find((r) => r.strategy === 'single')!;
      expect(singleResult.baselineLift).toBeUndefined();
      expect(singleResult.currentLift).toBeUndefined();
      expect(singleResult.liftChange).toBeUndefined();
    });

    it('includes significanceLevel in result', () => {
      const prev = makeSimple(15, { standard: 18 });
      const curr = makeSimple(15, { standard: 18 });
      const result = checkRegression(prev, curr, 0.05);
      expect(result.significanceLevel).toBe(0.05);
    });

    it('passes when significant improvement is detected', () => {
      // Large improvement: 3/10 → 10/10 is significant but positive delta
      const prev = makeBaseline(3, 10, { standard: { correct: 3, total: 10 } });
      const curr = makeBaseline(10, 10, { standard: { correct: 10, total: 10 } });
      const result = checkRegression(prev, curr);
      expect(result.passed).toBe(true);
      // Improvements should never flag as regressions
      for (const r of result.results) {
        expect(r.delta).toBeGreaterThan(0);
      }
    });
  });
});
