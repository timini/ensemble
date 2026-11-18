import { describe, it, expect, vi } from 'vitest';
import { ProAPIClient, type ProTransport } from './ProAPIClient';
import { ProviderError, isProviderError } from '../../errors/providerError';
import { createProviderClient } from '../../factories/createProviderClient';

function transport(overrides: Partial<ProTransport> = {}): ProTransport {
  return {
    streamText: vi.fn(async (_req, onChunk) => {
      onChunk('Hello ');
      onChunk('world');
      return { response: 'Hello world', responseTimeMs: 12, usage: { inputTokens: 3, outputTokens: 2 } };
    }),
    generateStructured: vi.fn(async () => ({ parsed: { a: 1 }, raw: '{"a":1}', responseTimeMs: 5 })),
    generateEmbeddings: vi.fn(async () => [0.1, 0.2]),
    ...overrides,
  };
}

describe('ProAPIClient', () => {
  it('streams chunks through the transport and completes with usage', async () => {
    const t = transport();
    const client = new ProAPIClient('openai', t);
    const chunks: string[] = [];
    const onComplete = vi.fn();
    await client.streamResponse('Q', 'gpt-5-mini', (c) => chunks.push(c), onComplete, vi.fn(), { temperature: 0.2 });
    expect(chunks).toEqual(['Hello ', 'world']);
    expect(onComplete).toHaveBeenCalledWith('Hello world', 12, 5, { inputTokens: 3, outputTokens: 2 });
    expect(t.streamText).toHaveBeenCalledWith(
      { provider: 'openai', model: 'gpt-5-mini', prompt: 'Q', temperature: 0.2 },
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it('reports transport errors as classified ProviderErrors', async () => {
    const t = transport({
      streamText: vi.fn(async () => {
        throw new ProviderError('Not enough credits', 'insufficient_credits');
      }),
    });
    const onError = vi.fn();
    await new ProAPIClient('anthropic', t).streamResponse('Q', 'm', vi.fn(), vi.fn(), onError);
    const error = onError.mock.calls[0]![0] as Error;
    expect(isProviderError(error) && error.kind).toBe('insufficient_credits');
  });

  it('cancels a stream when the signal fires, aborting the transport call', async () => {
    let transportSignal: AbortSignal | undefined;
    const t = transport({
      streamText: vi.fn(
        (_req, onChunk, signal) =>
          new Promise((_resolve, reject) => {
            transportSignal = signal;
            onChunk('partial');
            signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    });
    const controller = new AbortController();
    const onError = vi.fn();
    const onComplete = vi.fn();
    const done = new ProAPIClient('openai', t).streamResponse('Q', 'm', vi.fn(), onComplete, onError, {
      signal: controller.signal,
    });
    controller.abort();
    await done;
    expect(transportSignal?.aborted).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as ProviderError).kind).toBe('cancelled');
  });

  it('times out a stream that never ends', async () => {
    const t = transport({ streamText: vi.fn(() => new Promise(() => undefined)) });
    const onError = vi.fn();
    await new ProAPIClient('openai', t).streamResponse('Q', 'm', vi.fn(), vi.fn(), onError, { timeoutMs: 10 });
    expect((onError.mock.calls[0]![0] as ProviderError).kind).toBe('timeout');
  });

  it('passes structured output and embeddings through with the signal', async () => {
    const t = transport();
    const client = new ProAPIClient('google', t);
    const controller = new AbortController();
    const schema = { name: 's', schema: { type: 'object' } };
    const result = await client.generateStructured<{ a: number }>('Q', 'gemini-3-flash', schema, {
      signal: controller.signal,
    });
    expect(result.parsed).toEqual({ a: 1 });
    expect(t.generateStructured).toHaveBeenCalledWith(
      { provider: 'google', model: 'gemini-3-flash', prompt: 'Q', schema },
      controller.signal,
    );
    expect(await client.generateEmbeddings('text', { signal: controller.signal })).toEqual([0.1, 0.2]);
    expect(t.generateEmbeddings).toHaveBeenCalledWith({ provider: 'google', text: 'text' }, controller.signal);
  });

  it('classifies structured output failures', async () => {
    const t = transport({
      generateStructured: vi.fn(async () => {
        throw Object.assign(new Error('Too many requests'), { status: 429 });
      }),
    });
    await expect(
      new ProAPIClient('openai', t).generateStructured('Q', 'm', { name: 's', schema: {} }),
    ).rejects.toMatchObject({ name: 'ProviderError', kind: 'rate_limited' });
  });

  it('needs no key', async () => {
    expect(await new ProAPIClient('openai', transport()).validateApiKey('')).toEqual({ valid: true });
  });
});

describe('createProviderClient in Pro mode', () => {
  it('returns a ProAPIClient over the given transport', () => {
    const client = createProviderClient({ provider: 'openai', mode: 'pro', proTransport: transport() });
    expect(client).toBeInstanceOf(ProAPIClient);
  });

  it('requires a transport', () => {
    expect(() => createProviderClient({ provider: 'openai', mode: 'pro' })).toThrow(/proTransport/);
  });
});
