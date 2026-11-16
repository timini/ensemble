import { describe, expect, it } from 'vitest';
import {
  EMBEDDING_PROVIDERS,
  isEmbeddingProvider,
  selectEmbeddingsProvider,
} from './selectEmbeddingsProvider.js';

describe('selectEmbeddingsProvider', () => {
  it('lists OpenAI before Google', () => {
    expect(EMBEDDING_PROVIDERS).toEqual(['openai', 'google']);
  });

  it('prefers OpenAI in auto mode when both keys are valid', () => {
    expect(selectEmbeddingsProvider('auto', ['google', 'openai'])).toBe('openai');
  });

  it('falls back to Google in auto mode when OpenAI is missing', () => {
    expect(selectEmbeddingsProvider('auto', ['anthropic', 'google'])).toBe('google');
  });

  it('returns null when no embedding-capable key is valid', () => {
    expect(selectEmbeddingsProvider('auto', ['anthropic', 'xai'])).toBeNull();
    expect(selectEmbeddingsProvider('auto', [])).toBeNull();
  });

  it('honours an override whose key is valid', () => {
    expect(selectEmbeddingsProvider('google', ['openai', 'google'])).toBe('google');
  });

  it('falls back to auto when the override has no valid key', () => {
    expect(selectEmbeddingsProvider('google', ['openai'])).toBe('openai');
  });

  it('treats unknown preferences as auto', () => {
    expect(selectEmbeddingsProvider('anthropic', ['google'])).toBe('google');
  });

  it('identifies embedding-capable providers', () => {
    expect(isEmbeddingProvider('openai')).toBe(true);
    expect(isEmbeddingProvider('google')).toBe(true);
    expect(isEmbeddingProvider('anthropic')).toBe(false);
  });
});
