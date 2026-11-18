import { describe, it, expect, vi } from 'vitest';
import { withAbortSignal } from './withAbortSignal';
import type { AIProvider } from '../types';

function fakeProvider(): AIProvider {
  return {
    streamResponse: vi.fn(async () => undefined),
    generateStructured: vi.fn(async () => ({ parsed: {}, raw: '{}', responseTimeMs: 1 })),
    generateEmbeddings: vi.fn(async () => [1]),
    validateApiKey: vi.fn(async () => ({ valid: true })),
    listAvailableModels: vi.fn(() => []),
    listAvailableTextModels: vi.fn(async () => []),
  } as unknown as AIProvider;
}

describe('withAbortSignal', () => {
  it('adds the signal to every call, keeping the other options', async () => {
    const inner = fakeProvider();
    const signal = new AbortController().signal;
    const wrapped = withAbortSignal(inner, signal);
    const onChunk = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();
    await wrapped.streamResponse('p', 'm', onChunk, onComplete, onError, { temperature: 0 });
    expect(inner.streamResponse).toHaveBeenCalledWith('p', 'm', onChunk, onComplete, onError, {
      temperature: 0,
      signal,
    });
    await wrapped.generateStructured('p', 'm', { name: 'n', schema: {} });
    expect(inner.generateStructured).toHaveBeenCalledWith('p', 'm', { name: 'n', schema: {} }, { signal });
    await wrapped.generateEmbeddings('t');
    expect(inner.generateEmbeddings).toHaveBeenCalledWith('t', { signal });
  });
});
