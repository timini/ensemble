import { describe, expect, it } from 'vitest';
import {
  resolveBenchmarkDatasetName,
  toChoiceLetter,
} from './benchmarkDatasetShared.js';

describe('benchmarkDatasetShared', () => {
  it('normalizes dataset aliases', () => {
    expect(resolveBenchmarkDatasetName('gsm8k')).toBe('gsm8k');
    expect(resolveBenchmarkDatasetName('truthful_qa')).toBe('truthfulqa');
    expect(resolveBenchmarkDatasetName('gpqa-diamond')).toBe('gpqa');
    expect(resolveBenchmarkDatasetName('custom-dataset')).toBeNull();
  });

  it('converts supported choice indexes and rejects out-of-range values', () => {
    expect(toChoiceLetter(0)).toBe('A');
    expect(toChoiceLetter(25)).toBe('Z');
    expect(() => toChoiceLetter(26)).toThrow('Choice index out of range: 26');
    expect(() => toChoiceLetter(-1)).toThrow('Choice index out of range: -1');
  });
});
