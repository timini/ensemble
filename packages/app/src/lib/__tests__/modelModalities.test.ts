import { describe, expect, it } from 'vitest';
import { inferModelModalities, normalizeModelModalities } from '../modelModalities';

describe('model modality helpers', () => {
  it('defaults to text when modalities are missing', () => {
    expect(normalizeModelModalities(undefined)).toEqual(['text']);
  });

  it('normalizes and deduplicates explicit modalities', () => {
    expect(normalizeModelModalities(['Image', 'text', 'image'])).toEqual([
      'text',
      'image',
    ]);
  });

  it('infers text and image for gemini models', () => {
    expect(inferModelModalities('google', 'gemini-4-hydrogen')).toEqual([
      'text',
      'image',
    ]);
  });

  it('keeps xai models text-only unless explicit image hints are present', () => {
    expect(inferModelModalities('xai', 'grok-4.7')).toEqual(['text']);
  });

  it.each(['gpt-6-astra', 'gpt-6-luna', 'gpt-5-mini', 'gpt-4o'])(
    'infers image input for OpenAI model %s',
    (id) => {
      expect(inferModelModalities('openai', id)).toEqual(['text', 'image']);
    },
  );

  it('keeps older OpenAI text models text-only', () => {
    expect(inferModelModalities('openai', 'gpt-3.5-turbo')).toEqual(['text']);
  });

  it.each(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-3-5-sonnet-20241022'])(
    'infers image input for Anthropic model %s',
    (id) => {
      expect(inferModelModalities('anthropic', id)).toEqual(['text', 'image']);
    },
  );
});
