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
    expect(resolveBenchmarkDatasetName('hle')).toBe('hle');
    expect(resolveBenchmarkDatasetName('humanitys-last-exam')).toBe('hle');
    expect(resolveBenchmarkDatasetName('math500')).toBe('math500');
    expect(resolveBenchmarkDatasetName('math-500')).toBe('math500');
    expect(resolveBenchmarkDatasetName('mmlu_pro')).toBe('mmlu_pro');
    expect(resolveBenchmarkDatasetName('mmlu-pro')).toBe('mmlu_pro');
    expect(resolveBenchmarkDatasetName('mmlupro')).toBe('mmlu_pro');
    expect(resolveBenchmarkDatasetName('simpleqa')).toBe('simpleqa');
    expect(resolveBenchmarkDatasetName('simple-qa')).toBe('simpleqa');
    expect(resolveBenchmarkDatasetName('arc')).toBe('arc');
    expect(resolveBenchmarkDatasetName('arc-challenge')).toBe('arc');
    expect(resolveBenchmarkDatasetName('hellaswag')).toBe('hellaswag');
    expect(resolveBenchmarkDatasetName('hella-swag')).toBe('hellaswag');
    expect(resolveBenchmarkDatasetName('hallumix')).toBe('hallumix');
    expect(resolveBenchmarkDatasetName('hallu-mix')).toBe('hallumix');
    expect(resolveBenchmarkDatasetName('custom-dataset')).toBeNull();
  });

  it('converts supported choice indexes and rejects out-of-range values', () => {
    expect(toChoiceLetter(0)).toBe('A');
    expect(toChoiceLetter(25)).toBe('Z');
    expect(() => toChoiceLetter(26)).toThrow('Choice index out of range: 26');
    expect(() => toChoiceLetter(-1)).toThrow('Choice index out of range: -1');
  });
});
