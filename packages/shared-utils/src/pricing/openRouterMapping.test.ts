import { describe, expect, it } from 'vitest';
import modelsFixture from './__fixtures__/openrouter-models.json';
import embeddingsFixture from './__fixtures__/openrouter-embedding-models.json';
import {
  buildPriceTable,
  mapOpenRouterId,
  mapOpenRouterModels,
  perTokenToPerMillion,
} from './openRouterMapping';

describe('mapOpenRouterId', () => {
  it('maps vendor prefixes to our provider names', () => {
    expect(mapOpenRouterId('openai/gpt-6-astra')).toEqual({
      provider: 'openai',
      modelId: 'gpt-6-astra',
    });
    expect(mapOpenRouterId('x-ai/grok-4.7')).toEqual({ provider: 'xai', modelId: 'grok-4.7' });
    expect(mapOpenRouterId('google/gemini-4-carbon')).toEqual({
      provider: 'google',
      modelId: 'gemini-4-carbon',
    });
    expect(mapOpenRouterId('deepseek/deepseek-v4-pro')).toEqual({
      provider: 'deepseek',
      modelId: 'deepseek-v4-pro',
    });
    expect(mapOpenRouterId('perplexity/sonar-pro')).toEqual({
      provider: 'perplexity',
      modelId: 'sonar-pro',
    });
  });

  it('writes Anthropic version numbers with dashes, as the Anthropic API does', () => {
    expect(mapOpenRouterId('anthropic/claude-opus-5.5')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-opus-5-5',
    });
  });

  it('skips variants and vendors we do not call', () => {
    expect(mapOpenRouterId('openai/gpt-6-astra:batch')).toBeNull();
    expect(mapOpenRouterId('google/gemma-4-31b-it:free')).toBeNull();
    expect(mapOpenRouterId('tencent/hy4-flash')).toBeNull();
    expect(mapOpenRouterId('openrouter/auto')).toBeNull();
    expect(mapOpenRouterId('no-slash')).toBeNull();
  });
});

describe('perTokenToPerMillion', () => {
  it('converts a per-token string to USD per million tokens without float noise', () => {
    expect(perTokenToPerMillion('0.00001')).toBe(10);
    expect(perTokenToPerMillion('0.0000000507')).toBe(0.0507);
    expect(perTokenToPerMillion('0')).toBe(0);
  });

  it('returns null for missing, negative or non-numeric prices', () => {
    expect(perTokenToPerMillion(undefined)).toBeNull();
    expect(perTokenToPerMillion('-1')).toBeNull();
    expect(perTokenToPerMillion('abc')).toBeNull();
  });
});

describe('mapOpenRouterModels', () => {
  it('maps the fixture to provider/model keys with input and output prices', () => {
    const entries = mapOpenRouterModels(modelsFixture.data);

    expect(entries['openai/gpt-6-astra']).toEqual({
      inputPerMillion: 10,
      outputPerMillion: 50,
      openRouterId: 'openai/gpt-6-astra',
    });
    expect(entries['anthropic/claude-opus-5-5']).toEqual({
      inputPerMillion: 4,
      outputPerMillion: 20,
      openRouterId: 'anthropic/claude-opus-5.5',
    });
    expect(entries['xai/grok-4.7']?.outputPerMillion).toBe(6);
  });

  it('leaves out batch and free variants, other vendors and unusable prices', () => {
    const keys = Object.keys(mapOpenRouterModels(modelsFixture.data));

    expect(keys.some((key) => key.includes(':'))).toBe(false);
    expect(keys.some((key) => key.includes('hy4'))).toBe(false);
    expect(keys).not.toContain('openai/broken');
    expect(keys).not.toContain('google/gemma-4-31b-it');
  });

  it('treats a missing completion price as zero for embedding models', () => {
    const entries = mapOpenRouterModels(embeddingsFixture.data);

    expect(entries['openai/text-embedding-3-small']).toEqual({
      inputPerMillion: 0.02,
      outputPerMillion: 0,
      openRouterId: 'openai/text-embedding-3-small',
    });
    expect(entries['google/gemini-embedding-2']?.inputPerMillion).toBe(0.2);
    expect(Object.keys(entries)).not.toContain('cohere/embed-5-fast');
  });
});

describe('buildPriceTable', () => {
  it('merges chat and embedding models with sorted keys and a fetch date', () => {
    const table = buildPriceTable(
      [modelsFixture.data, embeddingsFixture.data],
      new Date('2026-11-16T12:00:00Z'),
    );

    expect(table.source).toBe('https://openrouter.ai/api/v1/models');
    expect(table.fetchedAt).toBe('2026-11-16');
    const keys = Object.keys(table.models);
    expect(keys).toEqual([...keys].sort());
    expect(keys).toContain('openai/text-embedding-3-small');
    expect(keys).toContain('openai/gpt-6-astra');
  });
});
