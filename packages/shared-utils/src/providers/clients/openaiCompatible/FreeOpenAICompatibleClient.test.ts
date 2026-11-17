import { describe, it, expect, vi } from 'vitest';
import { FreeOpenAICompatibleClient } from './FreeOpenAICompatibleClient';
import { isProviderError } from '../../errors/providerError';

const BASE = 'http://localhost:11434/v1';

const schema = {
  name: 'answer',
  schema: {
    type: 'object',
    properties: { answer: { type: 'string' } },
    required: ['answer'],
    additionalProperties: false,
  },
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function sse(events: unknown[]) {
  const text = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function makeClient(fetchImpl: typeof fetch, apiKey = '', embeddingModel?: string) {
  return new FreeOpenAICompatibleClient('openai-compatible', () => apiKey, {
    getBaseURL: () => BASE,
    getEmbeddingModel: () => embeddingModel,
    fetchImpl,
  });
}

function bodyOf(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  const init = fetchMock.mock.calls[call]![1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('FreeOpenAICompatibleClient', () => {
  it('lists every model the server returns, unfiltered', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: [{ id: 'llama3.2:3b' }, { id: 'nomic-embed-text' }, { id: 'qwen2.5:7b' }] }),
    );
    const models = await makeClient(fetchMock).listAvailableTextModels();
    expect(models).toEqual(['llama3.2:3b', 'nomic-embed-text', 'qwen2.5:7b']);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE}/models`);
  });

  it('sends no Authorization header without a key, and a bearer key when set', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({ data: [] })));
    await makeClient(fetchMock).listAvailableTextModels();
    await makeClient(fetchMock, 'sk-or-1').listAvailableTextModels();
    const first = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    const second = (fetchMock.mock.calls[1]![1] as RequestInit).headers as Record<string, string>;
    expect(first.Authorization).toBeUndefined();
    expect(second.Authorization).toBe('Bearer sk-or-1');
  });

  it('validates an endpoint with GET /models, empty key allowed', async () => {
    const ok = vi.fn().mockResolvedValue(json({ data: [{ id: 'm' }] }));
    expect(await makeClient(ok).validateApiKey('')).toEqual({ valid: true });

    const denied = vi.fn().mockResolvedValue(json({ error: { message: 'bad key' } }, 401));
    const result = await makeClient(denied).validateApiKey('sk-wrong');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/401/);
  });

  it('reports an unreachable server as invalid', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await makeClient(down).validateApiKey('');
    expect(result).toMatchObject({ valid: false });
  });

  it('streams chunks and reports usage from the final chunk', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sse([
        { choices: [{ delta: { content: 'Hel' } }] },
        { choices: [{ delta: { content: 'lo' } }] },
        { choices: [], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } },
        '[DONE]',
      ]),
    );
    const chunks: string[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();
    await makeClient(fetchMock).streamResponse('Hi', 'llama3.2:3b', (c) => chunks.push(c), onComplete, onError);

    expect(onError).not.toHaveBeenCalled();
    expect(chunks.join('')).toBe('Hello');
    expect(onComplete).toHaveBeenCalledWith('Hello', expect.any(Number), 7, { inputTokens: 5, outputTokens: 2 });
    expect(bodyOf(fetchMock)).toMatchObject({
      model: 'llama3.2:3b',
      stream: true,
      stream_options: { include_usage: true },
      messages: [{ role: 'user', content: 'Hi' }],
    });
  });

  it('classifies a 429 with Retry-After as rate limited', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: 'slow down' }, 429, { 'Retry-After': '12' }));
    const onError = vi.fn();
    await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), vi.fn(), onError);
    const error = onError.mock.calls[0]![0];
    expect(isProviderError(error)).toBe(true);
    expect(error).toMatchObject({ kind: 'rate_limited', retryAfterSeconds: 12, provider: 'openai-compatible' });
  });

  it('classifies a refused connection as provider unavailable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const onError = vi.fn();
    await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), vi.fn(), onError);
    expect(onError.mock.calls[0]![0]).toMatchObject({ kind: 'provider_unavailable' });
  });

  it('uses json_schema for structured output when the server accepts it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        choices: [{ message: { content: '{"answer":"4"}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 },
      }),
    );
    const result = await makeClient(fetchMock).generateStructured<{ answer: string }>('2+2?', 'm', schema);
    expect(result.parsed).toEqual({ answer: '4' });
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 3 });
    expect(bodyOf(fetchMock).response_format).toMatchObject({ type: 'json_schema' });
  });

  it('falls back to json_object, then to extracting JSON from plain text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: { message: 'response_format json_schema not supported' } }, 400))
      .mockResolvedValueOnce(json({ error: { message: 'json_object not supported' } }, 400))
      .mockResolvedValueOnce(
        json({ choices: [{ message: { content: 'Sure! ```json\n{"answer":"4"}\n```' } }] }),
      );
    const result = await makeClient(fetchMock).generateStructured<{ answer: string }>('2+2?', 'm', schema);
    expect(result.parsed).toEqual({ answer: '4' });
    expect(bodyOf(fetchMock, 1).response_format).toEqual({ type: 'json_object' });
    expect(bodyOf(fetchMock, 2).response_format).toBeUndefined();
    expect(String((bodyOf(fetchMock, 2).messages as { content: string }[])[0]!.content)).toMatch(/JSON schema/);
  });

  it('falls back when the server answers json_schema with text that is not JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ choices: [{ message: { content: 'The answer is 4.' } }] }))
      .mockResolvedValueOnce(json({ choices: [{ message: { content: '{"answer":"4"}' } }] }));
    const result = await makeClient(fetchMock).generateStructured<{ answer: string }>('2+2?', 'm', schema);
    expect(result.parsed).toEqual({ answer: '4' });
  });

  it('does not retry other formats on a key error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: 'no' }, 401));
    await expect(makeClient(fetchMock).generateStructured('q', 'm', schema)).rejects.toMatchObject({
      kind: 'invalid_key',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('embeds through POST /embeddings with the endpoint embedding model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [{ embedding: [0.1, 0.2] }] }));
    const client = makeClient(fetchMock, '', 'nomic-embed-text');
    expect(client.supportsEmbeddings).toBe(true);
    expect(await client.generateEmbeddings('hello')).toEqual([0.1, 0.2]);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE}/embeddings`);
    expect(bodyOf(fetchMock)).toEqual({ model: 'nomic-embed-text', input: 'hello' });
  });

  it('throws EmbeddingsNotSupportedError when no embedding model is set', async () => {
    const client = makeClient(vi.fn());
    await expect(client.generateEmbeddings('hello')).rejects.toThrow(/embeddings/i);
  });
});
