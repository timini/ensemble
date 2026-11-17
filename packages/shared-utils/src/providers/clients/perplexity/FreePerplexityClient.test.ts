import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FreePerplexityClient } from './FreePerplexityClient.js';
import { toAgentModelSelector, PERPLEXITY_TEXT_MODELS } from './perplexityAgentApi.js';

const fetchMock = vi.fn();

/** Builds a fetch Response whose body streams the given SSE events in small pieces. */
function sseResponse(events: unknown[], options: { splitAt?: number } = {}): Response {
  const text = events
    .map((event) => {
      const type = (event as { type?: string }).type;
      return `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
    })
    .join('');
  const encoder = new TextEncoder();
  const splitAt = options.splitAt ?? 7;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Split mid-line to prove the parser buffers partial events.
      for (let i = 0; i < text.length; i += splitAt) {
        controller.enqueue(encoder.encode(text.slice(i, i + splitAt)));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestOf(callIndex = 0): { url: string; init: RequestInit; body: Record<string, unknown> } {
  const [url, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit];
  return { url, init, body: init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {} };
}

describe('perplexityAgentApi', () => {
  it('maps app model ids to Agent API effort presets', () => {
    expect(toAgentModelSelector('perplexity-fast')).toEqual({ effort: 'fast' });
    expect(toAgentModelSelector('perplexity-low')).toEqual({ effort: 'low' });
    expect(toAgentModelSelector('perplexity-medium')).toEqual({ effort: 'medium' });
  });

  it('maps retired Sonar ids so saved selections keep working', () => {
    expect(toAgentModelSelector('sonar')).toEqual({ effort: 'fast' });
    expect(toAgentModelSelector('sonar-pro')).toEqual({ effort: 'fast' });
    expect(toAgentModelSelector('sonar-reasoning-pro')).toEqual({ effort: 'low' });
    expect(toAgentModelSelector('sonar-deep-research')).toEqual({ effort: 'high' });
  });

  it('passes provider/model ids through as a model', () => {
    expect(toAgentModelSelector('openai/gpt-6-luna')).toEqual({ model: 'openai/gpt-6-luna' });
  });

  it('offers the fast, low and medium presets', () => {
    expect(PERPLEXITY_TEXT_MODELS).toEqual(['perplexity-fast', 'perplexity-low', 'perplexity-medium']);
  });
});

describe('FreePerplexityClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('validateApiKey', () => {
    it('returns invalid for empty key without calling the API', async () => {
      const client = new FreePerplexityClient('perplexity', () => null);
      const result = await client.validateApiKey('');
      expect(result).toEqual({ valid: false, error: 'API key is required.' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('checks the key with the free GET /v1/models call', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { object: 'list', data: [] }));

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const result = await client.validateApiKey('pplx-test');

      expect(result).toEqual({ valid: true });
      const { url, init } = requestOf();
      expect(url).toBe('https://api.perplexity.ai/v1/models');
      expect(init.method ?? 'GET').toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer pplx-test');
    });

    it('returns invalid on 401', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(401, {
          error: { message: 'Invalid API key provided.', type: 'invalid_api_key', code: 401 },
        }),
      );

      const client = new FreePerplexityClient('perplexity', () => 'bad-key');
      const result = await client.validateApiKey('bad-key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('401');
    });

    it('returns invalid with the error message on network failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      const client = new FreePerplexityClient('perplexity', () => 'key');
      const result = await client.validateApiKey('key');
      expect(result).toEqual({ valid: false, error: 'Network failure' });
    });
  });

  describe('listAvailableTextModels', () => {
    it('returns the effort presets without an API call', async () => {
      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      await expect(client.listAvailableTextModels()).resolves.toEqual(PERPLEXITY_TEXT_MODELS);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('streamResponse', () => {
    it('posts an Agent API request and streams output_text deltas', async () => {
      fetchMock.mockResolvedValueOnce(
        sseResponse([
          { type: 'response.created', response: { id: 'resp_1', status: 'in_progress' } },
          { type: 'response.output_item.added', item: { type: 'search_results' } },
          { type: 'response.output_text.delta', delta: 'Hello' },
          { type: 'response.output_text.delta', delta: ' world' },
          {
            type: 'response.completed',
            response: {
              id: 'resp_1',
              status: 'completed',
              usage: { input_tokens: 4, output_tokens: 6, total_tokens: 10 },
            },
          },
        ]),
      );

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await client.streamResponse('test prompt', 'perplexity-fast', onChunk, onComplete, onError, {
        temperature: 0.2,
      });

      expect(onError).not.toHaveBeenCalled();
      expect(onChunk.mock.calls.map((call) => call[0])).toEqual(['Hello', ' world']);
      expect(onComplete).toHaveBeenCalledWith('Hello world', expect.any(Number), 10, {
        inputTokens: 4,
        outputTokens: 6,
      });

      const { url, init, body } = requestOf();
      expect(url).toBe('https://api.perplexity.ai/v1/agent');
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer pplx-test',
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      });
      // Presets fix their own sampling, so temperature is not forwarded.
      expect(body).toEqual({ effort: 'fast', input: 'test prompt', stream: true });
    });

    it('handles CRLF line endings and ignores [DONE]', async () => {
      const text =
        'event: response.output_text.delta\r\ndata: {"type":"response.output_text.delta","delta":"Hi"}\r\n\r\n' +
        'data: [DONE]\r\n\r\n';
      fetchMock.mockResolvedValueOnce(new Response(text, { status: 200 }));

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onComplete = vi.fn();
      const onError = vi.fn();
      await client.streamResponse('q', 'perplexity-low', vi.fn(), onComplete, onError);

      expect(onError).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledWith('Hi', expect.any(Number), undefined, undefined);
    });

    it('reports an error event from the stream', async () => {
      fetchMock.mockResolvedValueOnce(
        sseResponse([
          { type: 'response.output_text.delta', delta: 'Part' },
          { type: 'response.failed', response: { status: 'failed', error: { message: 'Upstream failed' } } },
        ]),
      );

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onComplete = vi.fn();
      const onError = vi.fn();
      await client.streamResponse('q', 'perplexity-fast', vi.fn(), onComplete, onError);

      expect(onComplete).not.toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('Upstream failed');
    });

    it('reports HTTP errors with the provider message', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(429, { error: { message: 'Rate limit exceeded', type: 'rate_limit', code: 429 } }),
      );

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onError = vi.fn();
      await client.streamResponse('q', 'perplexity-fast', vi.fn(), vi.fn(), onError);

      const message = onError.mock.calls[0][0].message as string;
      expect(message).toContain('Perplexity API error');
      expect(message).toContain('429');
      expect(message).toContain('Rate limit exceeded');
    });

    it('calls onError when fetch rejects', async () => {
      fetchMock.mockRejectedValueOnce(new Error('API down'));

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onError = vi.fn();
      await client.streamResponse('test', 'perplexity-fast', vi.fn(), vi.fn(), onError);

      expect(onError.mock.calls[0][0].message).toContain('Perplexity API error');
    });

    it('calls onError when no API key is set', async () => {
      const client = new FreePerplexityClient('perplexity', () => null);
      const onError = vi.fn();
      await client.streamResponse('test', 'perplexity-fast', vi.fn(), vi.fn(), onError);

      expect(onError.mock.calls[0][0].message).toContain('Missing API key');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
