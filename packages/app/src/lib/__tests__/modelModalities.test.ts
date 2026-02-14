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
    expect(inferModelModalities('google', 'gemini-2.0-flash')).toEqual([
      'text',
      'image',
    ]);
  });

  it('keeps xai models text-only unless explicit image hints are present', () => {
    expect(inferModelModalities('xai', 'grok-2')).toEqual(['text']);
  });
});
