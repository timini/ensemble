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

  it('stops retrying when the next attempt would end past the deadline', async () => {
    let now = 0;
    const fn = vi.fn().mockImplementation(async () => {
      now += 400;
      throw new Error('fetch failed');
    });
    await expect(retryable(fn, {
      maxRetries: 4, baseDelayMs: 1, maxJitterMs: 0, deadline: 1_000, attemptMs: 400, now: () => now,
      isRetryable: () => true,
    })).rejects.toThrow(/fetch failed/);
    // 400 ms used; a 400 ms attempt fits (ends at 801). At 800 ms, one more would end past 1000.
    expect(fn).toHaveBeenCalledTimes(2);
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
  });

  it('falls back to a plain reply when every structured format comes back empty', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { stream?: boolean };
      return Promise.resolve(body.stream
        ? sse([{ choices: [{ delta: { content: 'Two plus two.\nFinal answer: 4' } }] }, '[DONE]'])
        : completion(null));
    });
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
    const [response] = await runner.runPrompt('2+2?', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.error).toBeUndefined();
    expect(response!.answerSource).toBe('text');
    expect(response!.content).toMatch(/Final answer: 4/);
    expect(response!.structuredFallback).toMatch(/Empty response/);
    // json_schema, json_object and prompting, then one stream; no retry.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retries when the plain-reply fallback is empty too', async () => {
    let streams = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { stream?: boolean };
      if (!body.stream) return Promise.resolve(completion(null));
      streams += 1;
      return Promise.resolve(sse([{ choices: [{ delta: { content: streams === 1 ? '' : 'Final answer: 4' } }] }, '[DONE]']));
    });
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
    const [response] = await runner.runPrompt('2+2?', [MODEL], { answer: NUMBER_SPEC });
    expect(response!.content).toMatch(/Final answer: 4/);
    expect(response!.attempts).toBe(2);
    expect(streams).toBe(2);
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

  it('waits for Retry-After on a 503', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(json({ error: { message: 'overloaded' } }, 503, { 'Retry-After': '5' }))
        .mockResolvedValueOnce(answer('4'));
      const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
      const pending = runner.runPrompt('2+2?', [MODEL], { answer: NUMBER_SPEC });
      await vi.advanceTimersByTimeAsync(4_900);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(200);
      const [response] = await pending;
      expect(response!.content).toMatch(/Final answer: 4/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts no retry that could not finish before the deadline', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', {
      retry: { maxRetries: 4, baseDelayMs: 1, maxJitterMs: 0 },
      callTimeoutMs: 10_000,
    });
    const [response] = await runner.runPrompt('q', [MODEL], { answer: NUMBER_SPEC, deadline: Date.now() + 5_000 });
    expect(response!.error).toMatch(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts a call still running at the deadline, records it as timed out and keeps the others', async () => {
    const { fetchMock: hanging, signals } = hangingFetch();
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { model: string };
      return body.model === 'slow' ? hanging(url, init) : Promise.resolve(answer('4'));
    });
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY });
    const seen: number[] = [];
    const responses = await runner.runPrompt('q', [{ ...MODEL, model: 'fast' }, { ...MODEL, model: 'slow' }], {
      answer: NUMBER_SPEC, deadline: Date.now() + 30, onResponse: (i) => seen.push(i),
    });
    expect(responses[0]!.content).toMatch(/Final answer: 4/);
    expect(responses[1]!.error).toMatch(/timed out at the question deadline/);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(seen.sort()).toEqual([0, 1]);
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
  it('aborts the requests still running at the question limit, so nothing keeps running', async () => {
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
    // Both calls were cut off at the answers' deadline and count as timed out.
    const results = Object.values(output.runs[0]!.evaluation!.results);
    expect(results.every((r) => !r.correct && r.failure === 'timeout')).toBe(true);
    expect(output.runs[0]!.responses.every((r) => /timed out/.test(r.error ?? ''))).toBe(true);
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

  const QUESTION = { id: 'q1', prompt: 'Q', groundTruth: '4', answer: NUMBER_SPEC };
  const good = (model: string): ProviderResponse => ({
    ...MODEL, model, content: 'Final answer: 4', responseTimeMs: 5, answerSource: 'structured', estimatedCostUsd: 0.001,
  });

  it('keeps answers kept from an earlier attempt when the summarizer times out', async () => {
    const { fetchMock, signals } = hangingFetch();
    const models = ['a', 'b', 'c'].map((model) => ({ ...MODEL, model }));
    const kept = models.map((m) => good(m.model));
    const output = createBenchmarkFile('gsm8k', 'free', models.map((m) => `openai-compatible:${m.model}`), ['standard'], 1);
    const runner = new BenchmarkRunner({
      mode: 'free',
      registry: registry(client(fetchMock)),
      models,
      strategies: ['standard'],
      evaluator: new MechanicalEvaluator('numeric'),
      summarizer: models[0]!,
      parallelQuestions: true,
      questionTimeoutMs: 200,
      consensusTimeoutMs: 1_000,
      retry: FAST_RETRY,
      protocol: 'structured',
      priorResponses: new Map([['q1', kept]]),
    });
    await runner.run({ questions: [QUESTION], output, outputPath: '/dev/null' });
    const run = output.runs[0]!;
    expect(run.responses).toEqual(kept);
    expect(Object.values(run.evaluation!.results).every((r) => r.correct)).toBe(true);
    expect(run.consensusEvaluation!.results.standard!.correct).toBe(false);
    expect(run.consensusEvaluation!.results.standard!.failure).toBeDefined();
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('keeps the answers that came back when the question limit cuts it off', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(answer('4')));
    let firstCall = true;
    const evaluator = new MechanicalEvaluator('numeric');
    const slowOnce = {
      name: evaluator.name,
      evaluate: (response: string, truth: string) => {
        if (firstCall) {
          firstCall = false;
          return new Promise<never>(() => undefined);
        }
        return evaluator.evaluate(response, truth);
      },
    };
    const models = [{ ...MODEL, model: 'a' }, { ...MODEL, model: 'b' }];
    const output = createBenchmarkFile('gsm8k', 'free', models.map((m) => `openai-compatible:${m.model}`), [], 1);
    const runner = new BenchmarkRunner({
      mode: 'free', registry: registry(client(fetchMock)), models, strategies: [], evaluator: slowOnce,
      summarizer: null, parallelQuestions: true, questionTimeoutMs: 50, retry: FAST_RETRY, protocol: 'structured',
    });
    await runner.run({ questions: [QUESTION], output, outputPath: '/dev/null' });
    const run = output.runs[0]!;
    expect(run.failure).toBe('timeout');
    expect(run.responses.every((r) => !r.error && /Final answer: 4/.test(r.content))).toBe(true);
    expect(Object.values(run.evaluation!.results).every((r) => r.correct)).toBe(true);
  });

  it('replaces a rerun entry in place and carries the cost of what it replaced', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(answer('4')));
    const models = [{ ...MODEL, model: 'a' }, { ...MODEL, model: 'b' }];
    const output = createBenchmarkFile('gsm8k', 'free', models.map((m) => `openai-compatible:${m.model}`), [], 2);
    const keptAnswer = good('a');
    const failedAnswer: ProviderResponse = { ...MODEL, model: 'b', content: '', responseTimeMs: 0, error: 'fetch failed' };
    output.runs.push(
      { questionId: 'q1', prompt: 'Q', responses: [keptAnswer, failedAnswer], consensus: {},
        consensusMetrics: { standard: { tokenCount: 1, durationMs: 1, costUsd: 0.002 } } },
      { questionId: 'q0', prompt: 'Q0', responses: [good('a'), good('b')], consensus: {} },
    );
    const runner = new BenchmarkRunner({
      mode: 'free', registry: registry(client(fetchMock)), models, strategies: [],
      evaluator: new MechanicalEvaluator('numeric'), summarizer: null, parallelQuestions: true, protocol: 'structured',
      priorResponses: new Map([['q1', [keptAnswer, failedAnswer]]]),
    });
    await runner.run({ questions: [QUESTION], output, outputPath: '/dev/null', rerunIds: new Set(['q1']) });
    expect(output.runs.map((r) => r.questionId)).toEqual(['q1', 'q0']);
    expect(output.runs[0]!.responses[0]).toBe(keptAnswer);
    expect(output.runs[0]!.responses[1]!.content).toMatch(/Final answer: 4/);
    expect(output.runs[0]!.priorAttemptCostUsd).toBeCloseTo(0.002, 10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
