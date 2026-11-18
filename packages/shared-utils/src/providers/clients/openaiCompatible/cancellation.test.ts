import { describe, it, expect, vi } from 'vitest';
import { FreeOpenAICompatibleClient } from './FreeOpenAICompatibleClient';
import { classifyProviderError, isProviderError } from '../../errors/providerError';

const BASE = 'https://openrouter.ai/api/v1';

function makeClient(fetchImpl: typeof fetch, embeddingModel?: string) {
  return new FreeOpenAICompatibleClient('openai-compatible', () => 'sk-or-1', {
    getBaseURL: () => BASE,
    getEmbeddingModel: () => embeddingModel,
    fetchImpl,
  });
}

/** A streaming response that sends one chunk, then waits until the request is aborted. */
function hangingStream(signal: AbortSignal | null | undefined) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}\n\n`));
      signal?.addEventListener('abort', () => {
        controller.error(new DOMException('The operation was aborted.', 'AbortError'));
      });
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('cancellation and limits', () => {
  it('classifies an AbortError as cancelled', () => {
    const error = classifyProviderError(new DOMException('The operation was aborted.', 'AbortError'));
    expect(error.kind).toBe('cancelled');
  });

  it('aborts the upstream fetch and reports cancelled when the signal fires', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => Promise.resolve(hangingStream(init?.signal)));
    const controller = new AbortController();
    const onChunk = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const done = makeClient(fetchMock as unknown as typeof fetch).streamResponse(
      'Hi',
      'openai/gpt-5-mini',
      onChunk,
      onComplete,
      onError,
      { signal: controller.signal },
    );
    await vi.waitFor(() => expect(onChunk).toHaveBeenCalledWith('Hel'));
    controller.abort();
    await done;

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    const error = onError.mock.calls[0]![0] as Error;
    expect(isProviderError(error) && error.kind).toBe('cancelled');
  });

  it('sends no request when the signal is already aborted', async () => {
    const fetchMock = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const onError = vi.fn();
    await makeClient(fetchMock as unknown as typeof fetch).streamResponse('Hi', 'm', vi.fn(), vi.fn(), onError, {
      signal: controller.signal,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((onError.mock.calls[0]![0] as { kind: string }).kind).toBe('cancelled');
  });

  it('sends max_tokens when maxTokens is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('data: [DONE]\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );
    await makeClient(fetchMock).streamResponse('Hi', 'm', vi.fn(), vi.fn(), vi.fn(), { maxTokens: 512 });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body.max_tokens).toBe(512);
  });

  it('passes the signal and max_tokens to structured output', async () => {
    const controller = new AbortController();
    let forwardedAbortedWithCaller = false;
    // The request carries a signal that follows the caller's (it also fires on
    // the time limit), so aborting the caller's signal aborts the request.
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      controller.abort();
      forwardedAbortedWithCaller = init?.signal?.aborted === true;
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), { status: 200 }));
    });
    await expect(
      makeClient(fetchMock as unknown as typeof fetch).generateStructured('Q', 'm', { name: 'x', schema: {} }, {
        signal: controller.signal,
        maxTokens: 100,
      }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(forwardedAbortedWithCaller).toBe(true);
    expect(JSON.parse(init.body as string).max_tokens).toBe(100);
  });

  it('passes the signal to embeddings', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }), { status: 200 }),
    );
    const controller = new AbortController();
    await makeClient(fetchMock, 'openai/text-embedding-3-small').generateEmbeddings('text', {
      signal: controller.signal,
    });
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal).toBe(controller.signal);
  });
});
