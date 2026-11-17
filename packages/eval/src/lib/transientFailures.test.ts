/**
 * Failures seen in the 2026-11-17 matrix run: empty completions scored as
 * answers, `fetch failed` with no retry, per-call timeouts that did not
 * cancel the request, and a 120 s summarizer limit. Every client here is the
 * real OpenAI-compatible client over a mocked fetch.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  FreeOpenAICompatibleClient,
  type AIProvider,
  type ProviderRegistry,
} from '@ensemble-ai/shared-utils/providers';
import { createBenchmarkFile } from '../commands/benchmarkOutput.js';
import { BenchmarkRunner } from './benchmarkRunner.js';
import { generateConsensus } from './consensus.js';
import { EnsembleRunner } from './ensembleRunner.js';
import { MechanicalEvaluator } from './evaluators.js';
import type { AnswerSpec } from './finalAnswer.js';
import { backoffDelayMs, isTransientError, retryable } from './retryable.js';
import type { ProviderResponse } from '../types.js';

const FAST_RETRY = { maxRetries: 3, baseDelayMs: 1, maxJitterMs: 0 };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function sse(events: unknown[]) {
  const text = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const completion = (content: string | null, extra: Record<string, unknown> = {}) =>
  json({ choices: [{ message: { content }, finish_reason: 'stop', ...extra }], usage: { prompt_tokens: 10, completion_tokens: content ? 5 : 0, total_tokens: content ? 15 : 10 } });

const answer = (value: string) => completion(JSON.stringify({ reasoning: 'r', answer: value }));

function client(fetchImpl: typeof fetch): AIProvider {
  return new FreeOpenAICompatibleClient('openai-compatible', () => 'key', {
    getBaseURL: () => 'https://openrouter.ai/api/v1',
    fetchImpl,
  });
}

function registry(provider: AIProvider): ProviderRegistry {
  return { getProvider: () => provider } as unknown as ProviderRegistry;
}

/** A fetch that never answers until aborted. Records every signal it was given. */
function hangingFetch() {
  const signals: AbortSignal[] = [];
  const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
    signals.push(init.signal!);
    return new Promise((_, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    });
  });
  return { fetchMock, signals };
}

const NUMBER_SPEC: AnswerSpec = { kind: 'numeric' };
const MODEL = { provider: 'openai-compatible' as const, model: 'anthropic/claude-sonnet-5.5' };

describe('isTransientError and backoff', () => {
  it('treats network failures, 429, 5xx, timeouts and empty replies as transient', () => {
    expect(isTransientError(new Error('OpenAI-compatible API error: fetch failed'))).toBe(true);
    expect(isTransientError(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError(new Error('Empty response from m (finish_reason: stop).'))).toBe(true);
    expect(isTransientError(Object.assign(new Error('Streaming timeout for x after 120s'), { name: 'ProviderError', kind: 'timeout' }))).toBe(true);
  });

  it('does not retry key errors, bad requests or deliberate aborts', () => {
    expect(isTransientError({ status: 401 })).toBe(false);
    expect(isTransientError(Object.assign(new Error('400 bad schema'), { status: 400 }))).toBe(false);
    expect(isTransientError(new Error('Request to openai-compatible was aborted.'))).toBe(false);
    expect(isTransientError(new DOMException('aborted', 'AbortError'))).toBe(false);
  });

  it('backs off exponentially with jitter and honours a longer Retry-After, capped', () => {
    const options = { baseDelayMs: 1000, maxJitterMs: 500, maxDelayMs: 60_000 };
    expect(backoffDelayMs(0, options, undefined, () => 0)).toBe(1000);
    expect(backoffDelayMs(2, options, undefined, () => 1)).toBe(4500);
    expect(backoffDelayMs(0, options, { retryAfterSeconds: 12 }, () => 0)).toBe(12_000);
    expect(backoffDelayMs(0, options, { retryAfterSeconds: 600 }, () => 0)).toBe(60_000);
  });

  it('stops retrying once its signal aborts', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation(async () => {
      controller.abort();
      throw new Error('fetch failed');
    });
    await expect(retryable(fn, { ...FAST_RETRY, signal: controller.signal })).rejects.toThrow(/fetch failed/);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('EnsembleRunner over a mocked OpenRouter', () => {
  it('records an empty completion as a failed call, never as an answer', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { stream?: boolean };
      return Promise.resolve(body.stream
        ? sse([{ choices: [{ delta: { content: '' }, finish_reason: 'stop' }] }, { choices: [], usage: { prompt_tokens: 163, completion_tokens: 0, total_tokens: 163 } }, '[DONE]'])
        : completion(null));
    });
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free');
    const [response] = await runner.runPrompt('2+2?', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.error).toMatch(/Empty response/);
    expect(response!.content).toBe('');
    // Structured formats came back empty: the error is reported, not hidden behind a text fallback.
    expect(fetchMock.mock.calls.every(([, init]) => !(JSON.parse((init as RequestInit).body as string) as { stream?: boolean }).stream)).toBe(true);
  });

  it('retries an empty completion and keeps the answer that follows', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(completion(null, { finish_reason: 'error', error: { code: 502, message: 'Upstream error' } }))
      .mockResolvedValueOnce(answer('4'));
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
    const [response] = await runner.runPrompt('2+2?', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.error).toBeUndefined();
    expect(response!.answerSource).toBe('structured');
    expect(response!.content).toMatch(/Final answer: 4/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries fetch failed and ECONNRESET instead of falling back to a plain reply', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce(answer('7'));
    const onRetry = vi.fn();
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: { ...FAST_RETRY, onRetry } });
    const [response] = await runner.runPrompt('3+4?', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.answerSource).toBe('structured');
    expect(response!.content).toMatch(/Final answer: 7/);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('waits for Retry-After on a 429', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(json({ error: { message: 'slow down' } }, 429, { 'Retry-After': '2' }))
        .mockResolvedValueOnce(answer('4'));
      const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
      const pending = runner.runPrompt('2+2?', [MODEL], { answer: NUMBER_SPEC });
      await vi.advanceTimersByTimeAsync(1_900);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(200);
      const [response] = await pending;
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(response!.content).toMatch(/Final answer: 4/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after its retries and records the error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
    const [response] = await runner.runPrompt('q', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.error).toMatch(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('aborts a call that runs past its time limit, then retries it', async () => {
    const { fetchMock, signals } = hangingFetch();
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', {
      retry: { maxRetries: 1, baseDelayMs: 1, maxJitterMs: 0 },
      callTimeoutMs: 20,
    });
    const [response] = await runner.runPrompt('q', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.error).toMatch(/timeout/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});

describe('summarizer calls', () => {
  const responses: ProviderResponse[] = ['a', 'b'].map((content, i) => ({
    provider: 'openai-compatible', model: `m${i}`, content: `Final answer: ${content}`, responseTimeMs: 1,
  }));

  it('uses the configured time limit instead of the 120 s default, and retries a failed stream', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(sse([{ choices: [{ delta: { content: 'Final answer: a' } }] }, '[DONE]']));
    const inner = client(fetchMock);
    const stream = vi.spyOn(inner, 'streamResponse');
    const result = await generateConsensus(['standard'], 'q', responses, inner, 'qwen', undefined, {
      timeoutMs: 300_000, retry: FAST_RETRY,
    });
    expect(result.outputs.standard).toBe('Final answer: a');
    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[0]![5]).toMatchObject({ timeoutMs: 300_000 });
  });

  it('records an empty summary as a failed strategy', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(sse([{ choices: [{ delta: { content: '' } }] }, '[DONE]'])));
    const result = await generateConsensus(['standard'], 'q', responses, client(fetchMock), 'qwen', undefined, {
      retry: { maxRetries: 1, baseDelayMs: 1, maxJitterMs: 0 },
    });
    expect(result.outputs.standard).toBeUndefined();
    expect(result.errors?.standard).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('BenchmarkRunner', () => {
  it('aborts the requests of a question that times out, so nothing keeps running', async () => {
    const { fetchMock, signals } = hangingFetch();
    const output = createBenchmarkFile('gsm8k', 'free', ['openai-compatible:m'], [], 1);
    const runner = new BenchmarkRunner({
      mode: 'free',
      registry: registry(client(fetchMock)),
      models: [MODEL, MODEL],
      strategies: [],
      evaluator: new MechanicalEvaluator('numeric'),
      summarizer: null,
      parallelQuestions: true,
      questionTimeoutMs: 30,
      retry: FAST_RETRY,
      protocol: 'structured',
    });
    await runner.run({
      questions: [{ id: 'q1', prompt: 'Q', groundTruth: '4', answer: NUMBER_SPEC }],
      output,
      outputPath: '/dev/null',
    });
    expect(output.runs[0]!.failure).toBe('timeout');
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    // No retry starts after the abort.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('calls only the models whose kept answer failed', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(answer('4')));
    const kept: ProviderResponse = { ...MODEL, model: 'good', content: 'Final answer: 4', responseTimeMs: 5, answerSource: 'structured' };
    const failedAnswer: ProviderResponse = { ...MODEL, model: 'bad', content: '', responseTimeMs: 0 };
    const output = createBenchmarkFile('gsm8k', 'free', ['openai-compatible:good', 'openai-compatible:bad'], [], 1);
    const runner = new BenchmarkRunner({
      mode: 'free',
      registry: registry(client(fetchMock)),
      models: [{ ...MODEL, model: 'good' }, { ...MODEL, model: 'bad' }],
      strategies: [],
      evaluator: new MechanicalEvaluator('numeric'),
      summarizer: null,
      protocol: 'structured',
      priorResponses: new Map([['q1', [kept, failedAnswer]]]),
    });
    await runner.run({
      questions: [{ id: 'q1', prompt: 'Q', groundTruth: '4', answer: NUMBER_SPEC }],
      output,
      outputPath: '/dev/null',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string) as { model: string }).model).toBe('bad');
    expect(output.runs[0]!.responses[0]).toBe(kept);
    expect(output.runs[0]!.responses[1]!.content).toMatch(/Final answer: 4/);
  });
});
