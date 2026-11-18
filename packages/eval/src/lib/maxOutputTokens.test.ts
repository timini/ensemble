/**
 * Every call of the harness sends max_tokens. Without it OpenRouter reserves
 * the model's maximum (65536 tokens) against the balance and refuses with
 * 402 once the balance is low. The clients are the real OpenAI-compatible
 * client over a mocked fetch, so the assertions read the request bodies.
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
import { LLMJudgeNumericEvaluator, MechanicalEvaluator } from './evaluators.js';
import { isFailedRun } from './matrix/runner.js';
import { isInsufficientCreditsError, isTransientError } from './retryable.js';
import type { ProviderResponse } from '../types.js';

const FAST_RETRY = { maxRetries: 3, baseDelayMs: 1, maxJitterMs: 0 };
const MODEL = { provider: 'openai-compatible' as const, model: 'qwen/qwen3.5-9b' };
const CREDITS_MESSAGE = 'This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 3000.';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function sse(text: string) {
  const events = [{ choices: [{ delta: { content: text } }] }, '[DONE]'];
  const body = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const structured = (value: unknown) =>
  json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });

/** A fetch that answers streams with `text` and structured calls with `value`, recording every body. */
function recordingFetch(text = 'Final answer: 4', value: unknown = { reasoning: 'r', answer: '4' }) {
  const bodies: Array<Record<string, unknown>> = [];
  const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    bodies.push(body);
    return Promise.resolve(body.stream ? sse(text) : structured(value));
  });
  return { fetchMock, bodies };
}

function client(fetchImpl: typeof fetch): AIProvider {
  return new FreeOpenAICompatibleClient('openai-compatible', () => 'key', {
    getBaseURL: () => 'https://openrouter.ai/api/v1',
    fetchImpl,
  });
}

function registry(provider: AIProvider): ProviderRegistry {
  return { getProvider: () => provider } as unknown as ProviderRegistry;
}

describe('max_tokens on every call', () => {
  it('sends it on streamed and structured model answers', async () => {
    const { fetchMock, bodies } = recordingFetch();
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { maxOutputTokens: 4096 });
    await runner.runPrompt('Q', [MODEL]);
    await runner.runPrompt('Q', [MODEL], { answer: { kind: 'numeric' } });
    expect(bodies).toHaveLength(2);
    expect(bodies[0]!.stream).toBe(true);
    expect(bodies[1]!.response_format).toBeDefined();
    expect(bodies.map((b) => b.max_tokens)).toEqual([4096, 4096]);
  });

  it('sends it on the plain-reply fallback of a structured answer', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      bodies.push(body);
      return Promise.resolve(body.stream ? sse('Final answer: 4') : json({ choices: [{ message: { content: 'not json' }, finish_reason: 'stop' }] }));
    });
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { maxOutputTokens: 2048 });
    const [response] = await runner.runPrompt('Q', [MODEL], { answer: { kind: 'numeric' } });
    expect(response!.answerSource).toBe('text');
    expect(bodies.at(-1)!.stream).toBe(true);
    expect(bodies.every((b) => b.max_tokens === 2048)).toBe(true);
  });

  it('sends it on summarizer calls of the standard and majority strategies', async () => {
    const { fetchMock, bodies } = recordingFetch('Final answer: a', { answer: 'a', majority: 'a', count: 2 });
    const responses: ProviderResponse[] = ['a', 'a'].map((content, i) => ({
      provider: 'openai-compatible', model: `m${i}`, content: `Final answer: ${content}`, responseTimeMs: 1,
    }));
    await generateConsensus(['standard', 'majority'], 'q', responses, client(fetchMock), 'qwen', undefined, { maxTokens: 4096 });
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    expect(bodies.every((b) => b.max_tokens === 4096)).toBe(true);
  });

  it('BenchmarkRunner passes maxOutputTokens to answers and the summarizer', async () => {
    const { fetchMock, bodies } = recordingFetch();
    const output = createBenchmarkFile('gsm8k', 'free', ['openai-compatible:m', 'openai-compatible:m'], ['standard'], 1);
    const runner = new BenchmarkRunner({
      mode: 'free',
      registry: registry(client(fetchMock)),
      models: [MODEL, MODEL],
      strategies: ['standard'],
      evaluator: new MechanicalEvaluator('numeric'),
      summarizer: MODEL,
      protocol: 'structured',
      maxOutputTokens: 4096,
    });
    await runner.run({
      questions: [{ id: 'q1', prompt: 'Q', groundTruth: '4', answer: { kind: 'numeric' } }],
      output,
      outputPath: '/dev/null',
    });
    // Two structured answers and one streamed summary.
    expect(bodies).toHaveLength(3);
    expect(bodies.filter((b) => b.stream)).toHaveLength(1);
    expect(bodies.every((b) => b.max_tokens === 4096)).toBe(true);
  });

  it('sends a limit on judge calls', async () => {
    const { fetchMock, bodies } = recordingFetch('', { answer: '4' });
    await new LLMJudgeNumericEvaluator(client(fetchMock), 'judge').evaluate('It is 4', '4');
    expect(bodies[0]!.max_tokens).toBe(4096);
  });
});

describe('HTTP 402 (not enough credits)', () => {
  it('is not transient', () => {
    const error = Object.assign(new Error(`OpenAI-compatible API error: 402 ${CREDITS_MESSAGE}`), {
      name: 'ProviderError', kind: 'other', status: 402,
    });
    expect(isInsufficientCreditsError(error)).toBe(true);
    expect(isTransientError(error)).toBe(false);
    // The message alone, as stored in a results file.
    expect(isTransientError(new Error(`OpenAI-compatible API error: 402 ${CREDITS_MESSAGE}`))).toBe(false);
    expect(isInsufficientCreditsError({ status: 429 })).toBe(false);
  });

  it('is recorded as a failed answer with no retry and no plain-reply fallback', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({ error: { code: 402, message: CREDITS_MESSAGE } }, 402)));
    const runner = new EnsembleRunner(registry(client(fetchMock)), 'free', { retry: FAST_RETRY, maxOutputTokens: 4096 });
    const [response] = await runner.runPrompt('Q', [MODEL], { answer: { kind: 'numeric' } });
    expect(response!.error).toMatch(/402/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('counts as a failed entry, so --retry-failed runs it again', () => {
    const run = {
      prompt: 'Q', questionId: 'q1', responses: [{
        provider: 'openai-compatible', model: 'm', content: '', responseTimeMs: 0,
        error: `OpenAI-compatible API error: 402 ${CREDITS_MESSAGE}`,
      }],
    };
    expect(isFailedRun(run as Parameters<typeof isFailedRun>[0])).toBe(true);
  });
});
