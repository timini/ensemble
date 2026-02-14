import { describe, expect, it } from 'vitest';
import { explodeList, parseModelSpec, parseModelSpecs } from './modelSpecs.js';

describe('modelSpecs helpers', () => {
  it('explodes comma-separated and repeated values', () => {
    const values = explodeList([
      'openai:gpt-4o,anthropic:claude-3-5-sonnet-latest',
      'google:gemini-2.5-pro',
    ]);
    expect(values).toEqual([
      'openai:gpt-4o',
      'anthropic:claude-3-5-sonnet-latest',
      'google:gemini-2.5-pro',
    ]);
  });

  it('parses a valid provider:model spec', () => {
    expect(parseModelSpec('xai:grok-4')).toEqual({
      provider: 'xai',
      model: 'grok-4',
    });
  });

  it('throws on invalid provider', () => {
    expect(() => parseModelSpec('foo:model-1')).toThrow(/Invalid provider/);
  });

  it('throws when no model specs were provided', () => {
    expect(() => parseModelSpecs([])).toThrow(/At least one model/);
  });
});
