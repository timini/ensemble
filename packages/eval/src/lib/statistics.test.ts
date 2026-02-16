import { describe, expect, it, vi } from 'vitest';
import {
  computeMcNemar,
  computePairedBootstrapDelta,
  holmBonferroni,
} from './statistics.js';

describe('statistics', () => {
  it('computes McNemar contingency counts and p-value', () => {
    const result = computeMcNemar([
      { modelCorrect: true, strategyCorrect: true },
      { modelCorrect: true, strategyCorrect: false },
      { modelCorrect: false, strategyCorrect: true },
      { modelCorrect: false, strategyCorrect: false },
      { modelCorrect: false, strategyCorrect: true },
    ]);

    expect(result).toMatchObject({
      n11: 1,
      n10: 1,
      n01: 2,
      n00: 1,
    });
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it('computes paired bootstrap delta and confidence interval', () => {
    const random = vi.fn(() => 0.4);
    const result = computePairedBootstrapDelta(
      [
        { modelCorrect: false, strategyCorrect: true },
        { modelCorrect: false, strategyCorrect: true },
        { modelCorrect: true, strategyCorrect: true },
      ],
      100,
      random,
    );

    expect(result.meanDelta).toBeGreaterThan(0);
    expect(result.ciLow).toBeLessThanOrEqual(result.meanDelta);
    expect(result.ciHigh).toBeGreaterThanOrEqual(result.meanDelta);
  });

  describe('holmBonferroni', () => {
    it('returns single p-value unchanged', () => {
      const result = holmBonferroni([{ pValue: 0.03, label: 'test1' }]);
      expect(result).toHaveLength(1);
      expect(result[0].originalPValue).toBe(0.03);
      expect(result[0].correctedPValue).toBe(0.03);
      expect(result[0].significant).toBe(true);
      expect(result[0].label).toBe('test1');
    });

    it('marks all significant when all p-values are small', () => {
      const result = holmBonferroni([
        { pValue: 0.001, label: 'a' },
        { pValue: 0.005, label: 'b' },
        { pValue: 0.01, label: 'c' },
      ]);
      expect(result.every((r) => r.significant)).toBe(true);
    });

    it('marks none significant when all p-values are large', () => {
      const result = holmBonferroni([
        { pValue: 0.3, label: 'a' },
        { pValue: 0.4, label: 'b' },
        { pValue: 0.5, label: 'c' },
      ]);
      expect(result.every((r) => !r.significant)).toBe(true);
    });

    it('applies step-down correctly for mixed p-values', () => {
      const result = holmBonferroni([
        { pValue: 0.01, label: 'a' },
        { pValue: 0.03, label: 'b' },
        { pValue: 0.06, label: 'c' },
      ]);
      // Sorted: 0.01, 0.03, 0.06
      // Thresholds: 0.05/3=0.0167, 0.05/2=0.025, 0.05/1=0.05
      // 0.01 < 0.0167 -> significant
      // 0.03 > 0.025 -> stop, not significant
      // 0.06 -> not significant (step-down stops)
      expect(result[0].significant).toBe(true);
      expect(result[0].label).toBe('a');
      expect(result[1].significant).toBe(false);
      expect(result[1].label).toBe('b');
      expect(result[2].significant).toBe(false);
      expect(result[2].label).toBe('c');
    });

    it('returns empty array for empty input', () => {
      const result = holmBonferroni([]);
      expect(result).toEqual([]);
    });

    it('preserves original order when input is not sorted', () => {
      const result = holmBonferroni([
        { pValue: 0.06, label: 'c' },
        { pValue: 0.01, label: 'a' },
        { pValue: 0.03, label: 'b' },
      ]);
      // Original order should be preserved
      expect(result[0].label).toBe('c');
      expect(result[0].originalPValue).toBe(0.06);
      expect(result[1].label).toBe('a');
      expect(result[1].originalPValue).toBe(0.01);
      expect(result[2].label).toBe('b');
      expect(result[2].originalPValue).toBe(0.03);
      // Only the smallest p-value is significant (step-down stops at 0.03 > 0.025)
      expect(result[1].significant).toBe(true); // a: 0.01
      expect(result[0].significant).toBe(false); // c: 0.06
      expect(result[2].significant).toBe(false); // b: 0.03
    });

    it('enforces monotonicity on corrected p-values', () => {
      const result = holmBonferroni([
        { pValue: 0.01, label: 'a' },
        { pValue: 0.04, label: 'b' },
        { pValue: 0.03, label: 'c' },
      ]);
      // Sorted by pValue: a(0.01), c(0.03), b(0.04)
      // Corrected: min(1, 0.01*3)=0.03, min(1, 0.03*2)=0.06, min(1, 0.04*1)=0.04
      // Monotonicity: 0.03, max(0.06, 0.03)=0.06, max(0.04, 0.06)=0.06
      expect(result[0].correctedPValue).toBeCloseTo(0.03); // a
      expect(result[2].correctedPValue).toBeCloseTo(0.06); // c
      expect(result[1].correctedPValue).toBeCloseTo(0.06); // b
    });
  });
});
