import { describe, expect, it } from 'vitest';
import { wilsonScoreInterval } from './wilsonScore.js';

describe('wilsonScoreInterval', () => {
  it('computes interval for 50% accuracy with n=100', () => {
    const result = wilsonScoreInterval(50, 100);
    expect(result.center).toBeCloseTo(0.5, 1);
    expect(result.lower).toBeGreaterThan(0.39);
    expect(result.lower).toBeLessThan(0.42);
    expect(result.upper).toBeGreaterThan(0.58);
    expect(result.upper).toBeLessThan(0.61);
  });

  it('returns non-trivial lower bound for perfect accuracy (10/10)', () => {
    const result = wilsonScoreInterval(10, 10);
    // Wilson score upper bound is <= 1.0 (exactly 1.0 for pHat=1)
    expect(result.upper).toBeLessThanOrEqual(1.0);
    expect(result.center).toBeGreaterThan(0.8);
    // Key Wilson property: lower bound is non-trivially above 0.5 even at 10/10
    expect(result.lower).toBeGreaterThan(0.5);
  });

  it('returns lower >= 0 and center > 0 for 0% accuracy (0/10)', () => {
    const result = wilsonScoreInterval(0, 10);
    expect(result.lower).toBeGreaterThanOrEqual(0);
    expect(result.center).toBeGreaterThan(0);
    expect(result.upper).toBeGreaterThan(0);
  });

  it('returns all zeros when total is 0', () => {
    const result = wilsonScoreInterval(0, 0);
    expect(result).toEqual({ center: 0, lower: 0, upper: 0 });
  });

  it('produces wider interval at 0.99 confidence than 0.95', () => {
    const result95 = wilsonScoreInterval(50, 100, 0.95);
    const result99 = wilsonScoreInterval(50, 100, 0.99);
    const width95 = result95.upper - result95.lower;
    const width99 = result99.upper - result99.lower;
    expect(width99).toBeGreaterThan(width95);
  });

  it('matches known value for 7/10 at 95% confidence', () => {
    const result = wilsonScoreInterval(7, 10, 0.95);
    expect(result.center).toBeCloseTo(0.673, 1);
    expect(result.lower).toBeCloseTo(0.393, 1);
    expect(result.upper).toBeCloseTo(0.874, 1);
  });

  it('ensures lower bound is non-negative', () => {
    const result = wilsonScoreInterval(0, 5, 0.95);
    expect(result.lower).toBeGreaterThanOrEqual(0);
  });

  it('ensures upper bound does not exceed 1', () => {
    const result = wilsonScoreInterval(5, 5, 0.95);
    expect(result.upper).toBeLessThanOrEqual(1);
  });
});
