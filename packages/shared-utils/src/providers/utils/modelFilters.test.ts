import { describe, expect, it } from 'vitest';
import { hasNonTextModality } from './modelFilters';

describe('hasNonTextModality', () => {
  it('returns true for known non-text model ids', () => {
    expect(hasNonTextModality('gemini-2.5-flash-native-audio-preview-12-2025')).toBe(true);
    expect(hasNonTextModality('grok-imagine-video')).toBe(true);
    expect(hasNonTextModality('grok-2-vision-1212')).toBe(true);
    expect(hasNonTextModality('dall-e-3')).toBe(true);
    expect(hasNonTextModality('tts-1')).toBe(true);
    expect(hasNonTextModality('whisper-1')).toBe(true);
  });

  it('returns false for text-generation model ids', () => {
    expect(hasNonTextModality('gpt-4o')).toBe(false);
    expect(hasNonTextModality('o1-preview')).toBe(false);
    expect(hasNonTextModality('claude-3-5-sonnet-20241022')).toBe(false);
    expect(hasNonTextModality('gemini-1.5-pro')).toBe(false);
    expect(hasNonTextModality('grok-2')).toBe(false);
  });

  it('does not match partial substrings', () => {
    expect(hasNonTextModality('audiophile-model')).toBe(false);
    expect(hasNonTextModality('imagination-pro')).toBe(false);
    expect(hasNonTextModality('visualizer-v2')).toBe(false);
  });
});

