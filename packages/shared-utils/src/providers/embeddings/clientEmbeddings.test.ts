import { afterEach, describe, expect, it, vi } from 'vitest';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient.js';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient.js';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient.js';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient.js';
import { FreeDeepSeekClient } from '../clients/deepseek/FreeDeepSeekClient.js';
import { FreePerplexityClient } from '../clients/perplexity/FreePerplexityClient.js';
import { MockProviderClient } from '../clients/mock/MockProviderClient.js';
import {
  EmbeddingsNotSupportedError,
  isEmbeddingsNotSupportedError,
} from './errors.js';
import { GOOGLE_EMBEDDING_MODEL, OPENAI_EMBEDDING_MODEL } from './models.js';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Free client embeddings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('OpenAI calls the embeddings endpoint with text-embedding-3-small', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [{ embedding: [0.1, 0.9] }] }));
    const client = new FreeOpenAIClient('openai', () => 'sk-test');

    await expect(client.generateEmbeddings('hello')).resolves.toEqual([0.1, 0.9]);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/embeddings');
    expect(JSON.parse((init as RequestInit).body as string).model).toBe(
      OPENAI_EMBEDDING_MODEL,
    );
    expect(OPENAI_EMBEDDING_MODEL).toBe('text-embedding-3-small');
  });

  it('Google calls embedContent with the Gemini embedding model', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ embedding: { values: [0.3, 0.7] } }));
    const client = new FreeGoogleClient('google', () => 'AIza-test');

    await expect(client.generateEmbeddings('hello')).resolves.toEqual([0.3, 0.7]);
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain(`/models/${GOOGLE_EMBEDDING_MODEL}:embedContent`);
  });

  it('does not return fake vectors for providers without embeddings', async () => {
    const mockSpy = vi.spyOn(MockProviderClient.prototype, 'generateEmbeddings');
    const clients = [
      new FreeAnthropicClient('anthropic', () => 'sk-ant-test'),
      new FreeXAIClient('xai', () => 'xai-test'),
      new FreeDeepSeekClient('deepseek', () => 'sk-test'),
      new FreePerplexityClient('perplexity', () => 'pplx-test'),
    ];

    for (const client of clients) {
      const error = await client.generateEmbeddings('text').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(EmbeddingsNotSupportedError);
      expect(isEmbeddingsNotSupportedError(error)).toBe(true);
    }
    expect(mockSpy).not.toHaveBeenCalled();
  });

  it('reports whether a client supports embeddings', () => {
    expect(new FreeOpenAIClient('openai', () => null).supportsEmbeddings).toBe(true);
    expect(new FreeGoogleClient('google', () => null).supportsEmbeddings).toBe(true);
    expect(new FreeAnthropicClient('anthropic', () => null).supportsEmbeddings).toBe(
      false,
    );
  });

  it('still requires a key before calling the provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = new FreeOpenAIClient('openai', () => null);
    await expect(client.generateEmbeddings('x')).rejects.toThrow('Missing API key');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mock client keeps deterministic fake embeddings', async () => {
    const mock = new MockProviderClient();
    const a = await mock.generateEmbeddings('same text');
    const b = await mock.generateEmbeddings('same text');
    expect(a).toEqual(b);
    expect(a).toHaveLength(1536);
  });
});
