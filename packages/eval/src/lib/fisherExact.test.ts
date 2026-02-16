import { describe, expect, it } from 'vitest';
import { fisherExact } from './fisherExact.js';

describe('fisherExact', () => {
  it('returns p above 0.5 for identical results', () => {
    // Baseline: 20 correct, 10 wrong; Current: 20 correct, 10 wrong
    const result = fisherExact(20, 10, 20, 10);
    // One-sided p includes the observed table and all more extreme,
    // so for identical tables the p-value is above 0.5
    expect(result.pValue).toBeGreaterThan(0.5);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(result.oddsRatio).toBeCloseTo(1, 5);
  });

  it('returns non-significant p for small decrease', () => {
    // Baseline: 20 correct, 10 wrong; Current: 18 correct, 12 wrong
    const result = fisherExact(20, 10, 18, 12);
    expect(result.pValue).toBeGreaterThan(0.1);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(result.oddsRatio).toBeGreaterThan(1);
  });

  it('returns significant p for large decrease', () => {
    // Baseline: 25 correct, 5 wrong; Current: 15 correct, 15 wrong
    const result = fisherExact(25, 5, 15, 15);
    expect(result.pValue).toBeLessThan(0.1);
    expect(result.oddsRatio).toBeGreaterThan(1);
  });

  it('handles all correct in both groups', () => {
    // Baseline: 30 correct, 0 wrong; Current: 30 correct, 0 wrong
    const result = fisherExact(30, 0, 30, 0);
    expect(result.pValue).toBeCloseTo(1, 5);
    expect(result.oddsRatio).toBe(1);
  });

  it('returns very small p when current is all wrong', () => {
    // Baseline: 20 correct, 10 wrong; Current: 0 correct, 30 wrong
    const result = fisherExact(20, 10, 0, 30);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.oddsRatio).toBe(Infinity);
  });

  it('handles n=0 edge case gracefully', () => {
    const result = fisherExact(0, 0, 0, 0);
    expect(result.pValue).toBe(1);
    expect(result.oddsRatio).toBe(1);
  });

  it('matches textbook Fisher exact test result', () => {
    // Baseline: 8/10 correct, Current: 3/10 correct
    // a=8, b=2, c=3, d=7
    // One-sided Fisher p (lower tail for c) should be ~0.0325
    const result = fisherExact(8, 2, 3, 7);
    expect(result.pValue).toBeCloseTo(0.0325, 2);
    expect(result.oddsRatio).toBeCloseTo((8 * 7) / (2 * 3), 5);
  });

  it('handles larger sample sizes (n=500) without overflow', () => {
    // Baseline: 400 correct, 100 wrong; Current: 350 correct, 50 wrong
    const result = fisherExact(400, 100, 350, 50);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.pValue)).toBe(true);
    expect(Number.isFinite(result.oddsRatio)).toBe(true);
  });

  it('returns correct odds ratio', () => {
    const result = fisherExact(10, 5, 6, 9);
    expect(result.oddsRatio).toBeCloseTo((10 * 9) / (5 * 6), 5);
  });

  it('returns Infinity odds ratio when b*c is 0 and a*d > 0', () => {
    // Baseline: 10 correct, 0 wrong; Current: 5 correct, 5 wrong
    const result = fisherExact(10, 0, 5, 5);
    expect(result.oddsRatio).toBe(Infinity);
  });

  it('returns odds ratio of 1 when both numerator and denominator are 0', () => {
    // a=0, b=5, c=0, d=5 -> numerator=0, denominator=0
    const result = fisherExact(0, 5, 0, 5);
    expect(result.oddsRatio).toBe(1);
  });
});
