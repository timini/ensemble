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

  describe('empty completions, in-band errors and aborts', () => {
    /** A fetch that never answers until its signal aborts, like a hung connection. */
    function hangingFetch() {
      const signals: AbortSignal[] = [];
      const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const signal = init.signal!;
        signals.push(signal);
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
        });
      });
      return { fetchMock, signals };
    }

    it('reports an empty stream as an error, not as an empty answer', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        sse([
          { choices: [{ delta: { content: '' }, finish_reason: 'stop' }] },
          { choices: [], usage: { prompt_tokens: 163, completion_tokens: 0, total_tokens: 163 } },
          '[DONE]',
        ]),
      );
      const onComplete = vi.fn();
      const onError = vi.fn();
      await makeClient(fetchMock).streamResponse('Hi', 'anthropic/claude', vi.fn(), onComplete, onError);
      expect(onComplete).not.toHaveBeenCalled();
      expect(onError.mock.calls[0]![0].message).toMatch(/Empty response from anthropic\/claude \(finish_reason: stop; completion_tokens: 0\)/);
    });

    it('says when a stream carried reasoning but no answer', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        sse([{ choices: [{ delta: { reasoning: 'Let me think' }, finish_reason: 'length' }] }, '[DONE]']),
      );
      const onError = vi.fn();
      await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), vi.fn(), onError);
      expect(onError.mock.calls[0]![0].message).toMatch(/finish_reason: length; reasoning came back but no answer content/);
    });

    it('reports an error chunk sent after a 200 (OpenRouter mid-stream error)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        sse([
          { error: { code: 502, message: 'Upstream overloaded' }, choices: [{ delta: { content: '' }, finish_reason: 'error' }] },
          '[DONE]',
        ]),
      );
      const onError = vi.fn();
      await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), vi.fn(), onError);
      expect(onError.mock.calls[0]![0]).toMatchObject({ kind: 'provider_unavailable', status: 502 });
      expect(onError.mock.calls[0]![0].message).toMatch(/Upstream overloaded/);
    });

    it('joins content parts sent as an array', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        sse([{ choices: [{ delta: { content: [{ type: 'text', text: 'Final answer: 4' }] } }] }, '[DONE]']),
      );
      const onComplete = vi.fn();
      await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), onComplete, vi.fn());
      expect(onComplete.mock.calls[0]![0]).toBe('Final answer: 4');
    });

    it('throws an in-band choice error from a structured call without trying other formats', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        json({
          choices: [{ message: { content: null }, finish_reason: 'error', error: { code: 429, message: 'Rate limited upstream' } }],
          usage: { prompt_tokens: 163, completion_tokens: 0, total_tokens: 163 },
        }),
      );
      await expect(makeClient(fetchMock).generateStructured('q', 'm', schema)).rejects.toMatchObject({
        kind: 'rate_limited',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws an empty-response error when every structured format comes back empty', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(json({ choices: [{ message: { content: '' }, finish_reason: 'stop' }] })),
      );
      await expect(makeClient(fetchMock).generateStructured('q', 'm', schema)).rejects.toThrow(/Empty response from m/);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('reads structured JSON sent as content parts', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        json({ choices: [{ message: { content: [{ type: 'text', text: '{"answer":"4"}' }] } }] }),
      );
      const result = await makeClient(fetchMock).generateStructured<{ answer: string }>('q', 'm', schema);
      expect(result.parsed).toEqual({ answer: '4' });
    });

    it('asks OpenRouter to route structured calls only to hosts that honour response_format', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json({ choices: [{ message: { content: '{"answer":"4"}' } }] }));
      const client = new FreeOpenAICompatibleClient('openai-compatible', () => 'k', {
        getBaseURL: () => 'https://openrouter.ai/api/v1',
        fetchImpl: fetchMock,
      });
      await client.generateStructured('q', 'm', schema);
      expect(bodyOf(fetchMock).provider).toEqual({ require_parameters: true });

      const local = vi.fn().mockResolvedValue(json({ choices: [{ message: { content: '{"answer":"4"}' } }] }));
      await makeClient(local).generateStructured('q', 'm', schema);
      expect(bodyOf(local).provider).toBeUndefined();
    });

    it('names the finish reasons, host, id and completion tokens of an empty structured reply', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(json({
          id: 'gen-123',
          provider: 'HostB',
          choices: [{ message: { content: '' }, finish_reason: 'stop', native_finish_reason: 'end_turn' }],
          usage: { prompt_tokens: 50, completion_tokens: 0, total_tokens: 50 },
        })),
      );
      const error = await makeClient(fetchMock).generateStructured('q', 'm', schema).catch((e: Error) => e);
      expect((error as Error).message).toMatch(/finish_reason: stop/);
      expect((error as Error).message).toMatch(/native_finish_reason: end_turn/);
      expect((error as Error).message).toMatch(/served by: HostB/);
      expect((error as Error).message).toMatch(/id: gen-123/);
      expect((error as Error).message).toMatch(/completion_tokens: 0/);
    });

    it('names the host of an empty stream from its chunks', async () => {
      const fetchMock = vi.fn().mockResolvedValue(sse([
        { id: 'gen-9', provider: 'HostB', choices: [{ delta: { content: '' } }] },
        { id: 'gen-9', provider: 'HostB', choices: [{ delta: {}, finish_reason: 'stop', native_finish_reason: 'error' }],
          usage: { prompt_tokens: 50, completion_tokens: 0, total_tokens: 50 } },
        '[DONE]',
      ]));
      const onError = vi.fn();
      await makeClient(fetchMock).streamResponse('q', 'm', vi.fn(), vi.fn(), onError);
      const message = (onError.mock.calls[0]![0] as Error).message;
      expect(message).toMatch(/Empty response from m/);
      expect(message).toMatch(/native_finish_reason: error; served by: HostB; id: gen-9; completion_tokens: 0/);
    });

    it('sends routing preferences to OpenRouter and can turn require_parameters off', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(json({ choices: [{ message: { content: '{"answer":"4"}' } }] })),
      );
      const client = new FreeOpenAICompatibleClient('openai-compatible', () => 'k', {
        getBaseURL: () => 'https://openrouter.ai/api/v1',
        fetchImpl: fetchMock,
      });
      await client.generateStructured('q', 'm', schema, { routing: { requireParameters: false } });
      expect(bodyOf(fetchMock).provider).toBeUndefined();
      await client.generateStructured('q', 'm', schema, { routing: { provider: { ignore: ['HostB'] } } });
      expect(bodyOf(fetchMock, 1).provider).toEqual({ require_parameters: true, ignore: ['HostB'] });

      const stream = vi.fn().mockResolvedValue(sse([{ choices: [{ delta: { content: 'ok' } }] }, '[DONE]']));
      const streaming = new FreeOpenAICompatibleClient('openai-compatible', () => 'k', {
        getBaseURL: () => 'https://openrouter.ai/api/v1',
        fetchImpl: stream,
      });
      await streaming.streamResponse('q', 'm', vi.fn(), vi.fn(), vi.fn(), { routing: { provider: { ignore: ['HostB'] } } });
      expect(bodyOf(stream).provider).toEqual({ ignore: ['HostB'] });
    });

    it('tries the next format when OpenRouter has no host for the requested parameters', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json({ error: { message: 'No endpoints found that can handle the requested parameters.' } }, 404))
        .mockResolvedValueOnce(json({ choices: [{ message: { content: '{"answer":"4"}' } }] }));
      const result = await makeClient(fetchMock).generateStructured<{ answer: string }>('q', 'm', schema);
      expect(result.parsed).toEqual({ answer: '4' });
      expect(bodyOf(fetchMock, 1).response_format).toEqual({ type: 'json_object' });
    });

    it('aborts the request when the stream times out', async () => {
      const { fetchMock, signals } = hangingFetch();
      const onError = vi.fn();
      await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), vi.fn(), onError, { timeoutMs: 20 });
      expect(signals[0]!.aborted).toBe(true);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]![0]).toMatchObject({ kind: 'timeout' });
      expect(onError.mock.calls[0]![0].message).toMatch(/Streaming timeout/);
    });

    it('aborts a structured call on its timeout', async () => {
      const { fetchMock, signals } = hangingFetch();
      await expect(
        makeClient(fetchMock).generateStructured('q', 'm', schema, { timeoutMs: 20 }),
      ).rejects.toMatchObject({ kind: 'timeout', message: expect.stringMatching(/Structured output timeout/) });
      expect(signals[0]!.aborted).toBe(true);
    });

    it('aborts when the caller aborts its signal', async () => {
      const { fetchMock, signals } = hangingFetch();
      const controller = new AbortController();
      const pending = makeClient(fetchMock).generateStructured('q', 'm', schema, { signal: controller.signal });
      await vi.waitFor(() => expect(signals).toHaveLength(1));
      controller.abort();
      await expect(pending).rejects.toMatchObject({ kind: 'timeout', message: expect.stringMatching(/aborted/) });
      expect(signals[0]!.aborted).toBe(true);
    });
  });
});
