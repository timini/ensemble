import { describe, expect, it } from 'vitest';
import { computeRunCost, estimateTokensFromText, usageFromText } from './runCost';
import type { PriceTable } from './types';

const table: PriceTable = {
  source: 'test',
  fetchedAt: '2026-11-16',
  models: {
    'openai/a': { inputPerMillion: 1, outputPerMillion: 2, openRouterId: 'openai/a' },
  },
};

const call = (
  provider: string,
  inputTokens: number,
  outputTokens: number,
  source: 'reported' | 'estimated',
) => ({ provider, modelId: provider === 'openai' ? 'a' : 'x', inputTokens, outputTokens, source });

describe('estimateTokensFromText', () => {
  it('assumes about four characters per token, rounding up', () => {
    expect(estimateTokensFromText('')).toBe(0);
    expect(estimateTokensFromText('abcd')).toBe(1);
    expect(estimateTokensFromText('abcde')).toBe(2);
  });
});

describe('usageFromText', () => {
  it('estimates input from the prompt and output from the answer', () => {
    expect(usageFromText('a'.repeat(40), 'b'.repeat(80))).toEqual({
      inputTokens: 10,
      outputTokens: 20,
    });
  });
});

describe('computeRunCost', () => {
  it('sums reported calls and marks the total as actual', () => {
    const cost = computeRunCost([call('openai', 1000, 500, 'reported'), call('openai', 1000, 500, 'reported')], table);
    expect(cost.totalUsd).toBeCloseTo(0.004, 12);
    expect(cost.estimated).toBe(false);
    expect(cost.callCount).toBe(2);
    expect(cost.estimatedCallCount).toBe(0);
    expect(cost.unpricedModels).toEqual([]);
  });

  it('marks the total as estimated when any call has no reported usage', () => {
    const cost = computeRunCost([call('openai', 1000, 0, 'reported'), call('openai', 0, 1000, 'estimated')], table);
    expect(cost.totalUsd).toBeCloseTo(0.003, 12);
    expect(cost.estimated).toBe(true);
    expect(cost.estimatedCallCount).toBe(1);
  });

  it('lists unpriced models once and leaves them out of the total', () => {
    const cost = computeRunCost([call('xai', 10, 10, 'reported'), call('xai', 10, 10, 'reported')], table);
    expect(cost.totalUsd).toBe(0);
    expect(cost.unpricedModels).toEqual(['xai/x']);
  });
});
