import { describe, expect, it, vi } from 'vitest';
import { computeMcNemar, computePairedBootstrapDelta } from './statistics.js';

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
});
