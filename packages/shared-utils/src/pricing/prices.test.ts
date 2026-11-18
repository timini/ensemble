import { describe, expect, it } from 'vitest';
import { costOfTokens, getModelPrice, priceKeyCandidates } from './prices';
import { PRICE_TABLE } from './priceTable';
import type { PriceTable } from './types';

const table: PriceTable = {
  source: 'test',
  fetchedAt: '2026-11-16',
  models: {
    'openai/gpt-6-astra': { inputPerMillion: 10, outputPerMillion: 50, openRouterId: 'x' },
    'anthropic/claude-opus-5-5': { inputPerMillion: 4, outputPerMillion: 20, openRouterId: 'y' },
    'google/gemini-4-carbon': { inputPerMillion: 2, outputPerMillion: 10, openRouterId: 'z' },
  },
};

describe('getModelPrice', () => {
  it('returns input and output prices for a known model', () => {
    expect(getModelPrice('openai', 'gpt-6-astra', table)).toEqual({
      status: 'known',
      inputPerMillion: 10,
      outputPerMillion: 50,
    });
  });

  it('returns unknown rather than a guess for a model not in the table', () => {
    expect(getModelPrice('openai', 'gpt-99', table)).toEqual({ status: 'unknown' });
    expect(getModelPrice('mistral', 'gpt-6-astra', table)).toEqual({ status: 'unknown' });
  });

  it('accepts Anthropic ids written with dots', () => {
    expect(getModelPrice('anthropic', 'claude-opus-5.5', table).status).toBe('known');
  });

  it('accepts Gemini ids with the models/ prefix', () => {
    expect(getModelPrice('google', 'models/gemini-4-carbon', table).status).toBe('known');
  });

  it('uses the generated table by default', () => {
    const [key] = Object.keys(PRICE_TABLE.models);
    const [provider, ...rest] = key!.split('/');
    expect(getModelPrice(provider!, rest.join('/')).status).toBe('known');
  });
});

describe('priceKeyCandidates', () => {
  it('lists the exact key first', () => {
    expect(priceKeyCandidates('openai', 'gpt-6-astra')[0]).toBe('openai/gpt-6-astra');
  });
});

describe('costOfTokens', () => {
  it('prices input and output tokens separately', () => {
    const price = getModelPrice('openai', 'gpt-6-astra', table);
    // 1000 * 10 / 1e6 + 500 * 50 / 1e6
    expect(costOfTokens(price, 1000, 500)).toBeCloseTo(0.035, 10);
  });

  it('returns null for an unknown price', () => {
    expect(costOfTokens({ status: 'unknown' }, 1000, 500)).toBeNull();
  });
});
