import { describe, expect, it, vi } from 'vitest';
import { requestGeminiEmbedding } from './geminiEmbeddings.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('requestGeminiEmbedding', () => {
  it('calls embedContent with the key header and text part', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ embedding: { values: [0.4, 0.5] } }));

    const vector = await requestGeminiEmbedding({
      apiKey: 'AIza-test',
      model: 'gemini-embedding-2',
      text: 'bonjour',
      fetchImpl,
    });

    expect(vector).toEqual([0.4, 0.5]);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent',
    );
    expect(init.method).toBe('POST');
    expect(init.headers['x-goog-api-key']).toBe('AIza-test');
    expect(JSON.parse(init.body)).toEqual({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text: 'bonjour' }] },
    });
  });

  it('throws a sanitized error on HTTP failure', async () => {
    const key = 'AIzaSyA1234567890abcdefghijklmnop';
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { message: `API key not valid: ${key}` } }, 400));

    const promise = requestGeminiEmbedding({
      apiKey: key,
      model: 'gemini-embedding-2',
      text: 'x',
      fetchImpl,
    });
    await expect(promise).rejects.toThrow(/400/);
    await expect(promise).rejects.not.toThrow(key);
  });

  it('throws when the response has no values', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ embedding: {} }));
    await expect(
      requestGeminiEmbedding({ apiKey: 'k', model: 'm', text: 'x', fetchImpl }),
    ).rejects.toThrow('no embedding');
  });
});
