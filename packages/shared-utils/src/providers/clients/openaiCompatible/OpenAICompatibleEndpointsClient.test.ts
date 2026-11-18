import { describe, it, expect, vi } from 'vitest';
import { OpenAICompatibleEndpointsClient } from './OpenAICompatibleEndpointsClient';
import type { OpenAICompatibleEndpointConfig } from './OpenAICompatibleEndpointsClient';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const ENDPOINTS: OpenAICompatibleEndpointConfig[] = [
  { id: 'ollama', baseURL: 'http://localhost:11434/v1', apiKey: '', embeddingModel: 'nomic-embed-text' },
  { id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', apiKey: 'sk-or' },
];

/** Fake fetch that answers per base URL. */
function routedFetch() {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url === 'http://localhost:11434/v1/models') return Promise.resolve(json({ data: [{ id: 'llama3.2:3b' }] }));
    if (url === 'https://openrouter.ai/api/v1/models')
      return Promise.resolve(json({ data: [{ id: 'meta-llama/llama-3.1-8b-instruct' }] }));
    if (url.endsWith('/embeddings')) return Promise.resolve(json({ data: [{ embedding: [1, 0] }] }));
    if (url.endsWith('/chat/completions')) {
      const body = JSON.parse(init!.body as string) as { model: string };
      return Promise.resolve(json({ choices: [{ message: { content: `{"model":"${body.model}"}` } }] }));
    }
    return Promise.resolve(json({ error: 'not found' }, 404));
  });
}

describe('OpenAICompatibleEndpointsClient', () => {
  it('lists the models of every endpoint, qualified with the endpoint id', async () => {
    const client = new OpenAICompatibleEndpointsClient(() => ENDPOINTS, { fetchImpl: routedFetch() as unknown as typeof fetch });
    expect(await client.listAvailableTextModels()).toEqual([
      'ollama/llama3.2:3b',
      'openrouter/meta-llama/llama-3.1-8b-instruct',
    ]);
  });

  it('skips an endpoint that cannot be reached', async () => {
    const fetchImpl = vi.fn((url: string) =>
      url.includes('11434') ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(json({ data: [{ id: 'x/y' }] })),
    );
    const client = new OpenAICompatibleEndpointsClient(() => ENDPOINTS, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await client.listAvailableTextModels()).toEqual(['openrouter/x/y']);
  });

  it('routes a call to the endpoint named in the model id, with the bare model id', async () => {
    const fetchImpl = routedFetch();
    const client = new OpenAICompatibleEndpointsClient(() => ENDPOINTS, { fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await client.generateStructured<{ model: string }>(
      'q',
      'openrouter/meta-llama/llama-3.1-8b-instruct',
      { name: 's', schema: {} },
    );
    expect(result.parsed.model).toBe('meta-llama/llama-3.1-8b-instruct');
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('reports an error for a model whose endpoint is not configured', async () => {
    const client = new OpenAICompatibleEndpointsClient(() => ENDPOINTS, { fetchImpl: routedFetch() as unknown as typeof fetch });
    const onError = vi.fn();
    await client.streamResponse('q', 'lmstudio/qwen', vi.fn(), vi.fn(), onError);
    expect(onError.mock.calls[0]![0]).toMatchObject({ name: 'ProviderError', kind: 'other' });
    await expect(client.generateStructured('q', 'nope', { name: 's', schema: {} })).rejects.toThrow(/No configured/);
  });

  it('embeds with the first endpoint that has an embedding model', async () => {
    const fetchImpl = routedFetch();
    const client = new OpenAICompatibleEndpointsClient(() => [...ENDPOINTS].reverse(), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(await client.generateEmbeddings('hi')).toEqual([1, 0]);
    expect(fetchImpl.mock.calls[0]![0]).toBe('http://localhost:11434/v1/embeddings');
  });

  it('throws EmbeddingsNotSupportedError when no endpoint has an embedding model', async () => {
    const client = new OpenAICompatibleEndpointsClient(() => [ENDPOINTS[1]!], { fetchImpl: routedFetch() as unknown as typeof fetch });
    await expect(client.generateEmbeddings('hi')).rejects.toMatchObject({ name: 'EmbeddingsNotSupportedError' });
  });

  it('validates one endpoint by listing its models', async () => {
    const client = new OpenAICompatibleEndpointsClient(() => ENDPOINTS, { fetchImpl: routedFetch() as unknown as typeof fetch });
    expect(await client.validateEndpoint(ENDPOINTS[0]!)).toEqual({ valid: true });
    expect(await client.validateEndpoint({ id: 'custom', baseURL: '', apiKey: '' })).toMatchObject({ valid: false });
  });
});
