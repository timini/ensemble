import { describe, expect, it } from 'vitest';
import { FALLBACK_MODELS } from '../models';
import { PRESETS } from '~/app/ensemble/page.constants';

// Ids that providers have retired or replaced. None of them should appear in
// the fallback list or the built-in presets.
const RETIRED_MODEL_IDS = [
  'grok-1',
  'grok-2',
  'grok-beta',
  'gpt-4o',
  'gpt-4o-mini',
  'o1-preview',
  'o1-mini',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'deepseek-chat',
  'deepseek-reasoner',
  'sonar-reasoning',
];

const PROVIDERS = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'] as const;

describe('FALLBACK_MODELS', () => {
  it('contains no retired model ids', () => {
    const ids = FALLBACK_MODELS.map((model) => model.id);
    for (const retired of RETIRED_MODEL_IDS) {
      expect(ids).not.toContain(retired);
    }
  });

  it.each(PROVIDERS)('lists 2 to 4 models for %s', (provider) => {
    const count = FALLBACK_MODELS.filter((model) => model.provider === provider).length;
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(4);
  });

  it('has unique ids', () => {
    const ids = FALLBACK_MODELS.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the current Anthropic models', () => {
    const ids = FALLBACK_MODELS.map((model) => model.id);
    expect(ids).toEqual(
      expect.arrayContaining(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']),
    );
  });
});

describe('PRESETS', () => {
  const fallbackIds = new Set(FALLBACK_MODELS.map((model) => model.id));

  it.each(PRESETS.map((preset) => [preset.id, preset] as const))(
    'preset %s only uses models from the fallback list',
    (_id, preset) => {
      for (const modelId of preset.modelIds) {
        expect(fallbackIds.has(modelId)).toBe(true);
      }
      expect(fallbackIds.has(preset.summarizerId)).toBe(true);
      expect(preset.modelIds).toContain(preset.summarizerId);
    },
  );

  it('presets span at least three providers each', () => {
    for (const preset of PRESETS) {
      const providers = new Set(
        preset.modelIds.map(
          (id) => FALLBACK_MODELS.find((model) => model.id === id)?.provider,
        ),
      );
      expect(providers.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('includes a budget preset', () => {
    expect(PRESETS.map((preset) => preset.id)).toContain('rapid-drafting');
  });
});
