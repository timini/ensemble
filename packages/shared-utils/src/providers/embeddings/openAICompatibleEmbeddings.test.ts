import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestOpenAICompatibleEmbedding } from './openAICompatibleEmbeddings.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('requestOpenAICompatibleEmbedding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to {baseURL}/embeddings with model, input and bearer key', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ embedding: [0.1, 0.2, 0.3] }] }));

    const vector = await requestOpenAICompatibleEmbedding({
      baseURL: 'https://api.openai.com/v1/',
      apiKey: 'sk-test-123456789',
      model: 'text-embedding-3-small',
      input: 'hello',
      fetchImpl,
    });

    expect(vector).toEqual([0.1, 0.2, 0.3]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/embeddings');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk-test-123456789');
    expect(JSON.parse(init.body)).toEqual({
      model: 'text-embedding-3-small',
      input: 'hello',
    });
  });

  it('omits the Authorization header when no key is given (local servers)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ embedding: [1, 0] }] }));

    await requestOpenAICompatibleEmbedding({
      baseURL: 'http://localhost:11434/v1',
      model: 'nomic-embed-text',
      input: 'hi',
      fetchImpl,
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('http://localhost:11434/v1/embeddings');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('throws a sanitized error with the status on HTTP failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { message: 'Incorrect API key provided: sk-proj-abcdefghijkl' } },
        401,
      ),
    );

    const promise = requestOpenAICompatibleEmbedding({
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'sk-proj-abcdefghijkl',
      model: 'text-embedding-3-small',
      input: 'x',
      fetchImpl,
    });

    await expect(promise).rejects.toThrow(/401/);
    await expect(promise).rejects.not.toThrow(/sk-proj-abcdefghijkl/);
  });

  it('throws when the response has no embedding', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

    await expect(
      requestOpenAICompatibleEmbedding({
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'k',
        model: 'm',
        input: 'x',
        fetchImpl,
      }),
    ).rejects.toThrow('no embedding');
  });

  it('uses the global fetch when none is injected', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [{ embedding: [0.5] }] }));

    await expect(
      requestOpenAICompatibleEmbedding({
        baseURL: 'https://example.test/v1',
        model: 'm',
        input: 'x',
      }),
    ).resolves.toEqual([0.5]);
    expect(spy).toHaveBeenCalled();
  });
});
