import type {
  AIProvider,
  ProviderRegistry,
  StreamResponseOptions,
} from '@ensemble-ai/shared-utils/providers';
import { describe, expect, it, vi } from 'vitest';
import { EnsembleRunner } from './ensembleRunner.js';
import type { EvalProvider } from '../types.js';

function buildProvider(args: {
  onStream: (
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (
      fullResponse: string,
      responseTime: number,
      tokenCount?: number,
      usage?: { inputTokens: number; outputTokens: number },
    ) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ) => Promise<void>;
  models?: Array<{ id: string; costPer1kTokens: number }>;
}): AIProvider {
  return {
    streamResponse: args.onStream,
    generateStructured: async () => ({ parsed: {} as never, raw: '{}', responseTimeMs: 0 }),
    generateEmbeddings: async () => [],
    validateApiKey: async () => ({ valid: true }),
    listAvailableModels: () =>
      (args.models ?? []).map((model) => ({
        id: model.id,
        name: model.id,
        provider: 'openai',
        contextWindow: 128_000,
        costPer1kTokens: model.costPer1kTokens,
      })),
    listAvailableTextModels: async () => [],
  };
}

function buildRegistry(providers: Partial<Record<EvalProvider, AIProvider>>): ProviderRegistry {
  return {
    getProvider: (provider: EvalProvider) => providers[provider],
  } as unknown as ProviderRegistry;
}

describe('EnsembleRunner', () => {
  it('collects responses, prices reported usage from the shared table, and keeps failed runs', async () => {
    const openaiProvider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete) => {
        onComplete('openai answer', 40, 1200, { inputTokens: 200, outputTokens: 1000 });
      },
      models: [{ id: 'gpt-4o', costPer1kTokens: 0.01 }],
    });
    const anthropicProvider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, _onComplete, onError) => {
        onError(new Error('provider error'));
      },
      models: [{ id: 'claude', costPer1kTokens: 0.02 }],
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: openaiProvider,
        anthropic: anthropicProvider,
        google: openaiProvider,
        xai: openaiProvider,
        deepseek: openaiProvider,
        perplexity: openaiProvider,
      }),
      'mock',
    );

    const results = await runner.runPrompt('Test prompt', [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-4o',
      content: 'openai answer',
      responseTimeMs: 40,
      tokenCount: 1200,
    });
    // gpt-4o in the shared price table: $2.50 input, $10 output per million tokens.
    expect(results[0].estimatedCostUsd).toBeCloseTo((200 * 2.5 + 1000 * 10) / 1e6, 12);
    expect(results[0].costFromTextLength).toBeUndefined();
    // Usage is kept so token assumptions can be fitted later (calibrate-tokens).
    expect(results[0].usage).toEqual({ inputTokens: 200, outputTokens: 1000, source: 'reported' });
    // No price for an unknown model id: no cost rather than a guess.
    expect(results[1].estimatedCostUsd).toBeUndefined();
    expect(results[1]).toMatchObject({
      provider: 'anthropic',
      model: 'claude',
      error: 'provider error',
    });
  });

  it('estimates tokens from text length when the provider reports no usage', async () => {
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete) => {
        onComplete('openai answer', 40, 1200);
      },
    });
    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
    );

    const [result] = await runner.runPrompt('Test prompt', [{ provider: 'openai', model: 'gpt-4o' }]);

    // 'Test prompt' is 11 characters (3 tokens), 'openai answer' 13 (4 tokens).
    expect(result.estimatedCostUsd).toBeCloseTo((3 * 2.5 + 4 * 10) / 1e6, 12);
    expect(result.costFromTextLength).toBe(true);
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 4, source: 'estimated' });
  });

  it('supports configurable delay between starting model calls', async () => {
    const startTimes: number[] = [];
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete) => {
        startTimes.push(Date.now());
        onComplete('ok', 1, 10);
      },
      models: [
        { id: 'model-a', costPer1kTokens: 0.001 },
        { id: 'model-b', costPer1kTokens: 0.001 },
      ],
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
      { requestDelayMs: 25 },
    );

    await runner.runPrompt('Delayed prompt', [
      { provider: 'openai', model: 'model-a' },
      { provider: 'openai', model: 'model-b' },
    ]);

    expect(startTimes).toHaveLength(2);
    expect(startTimes[1] - startTimes[0]).toBeGreaterThanOrEqual(20);
  });

  it('passes temperature option through to streamResponse', async () => {
    let receivedOptions: StreamResponseOptions | undefined;
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete, _onError, options) => {
        receivedOptions = options;
        onComplete('ok', 1, 10);
      },
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
      { temperature: 0 },
    );

    await runner.runPrompt('Test', [{ provider: 'openai', model: 'gpt-4o' }]);

    expect(receivedOptions).toEqual({ temperature: 0 });
  });

  it('does not pass streamOptions when temperature is not set', async () => {
    let receivedOptions: StreamResponseOptions | undefined = { temperature: 999 };
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete, _onError, options) => {
        receivedOptions = options;
        onComplete('ok', 1, 10);
      },
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
    );

    await runner.runPrompt('Test', [{ provider: 'openai', model: 'gpt-4o' }]);

    expect(receivedOptions).toBeUndefined();
  });

  it('retries on rate-limit error and eventually succeeds', async () => {
    let callCount = 0;
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete, onError) => {
        callCount++;
        if (callCount <= 2) {
          onError(new Error('Rate limit exceeded'));
          return;
        }
        onComplete('success', 10, 50);
      },
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
      { retry: { maxRetries: 3, baseDelayMs: 1, maxJitterMs: 0 } },
    );

    const results = await runner.runPrompt('Test', [
      { provider: 'openai', model: 'gpt-4o' },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('success');
    expect(results[0].error).toBeUndefined();
    expect(callCount).toBe(3);
  });

  it('does not retry non-retryable errors (auth failure)', async () => {
    let callCount = 0;
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, _onComplete, onError) => {
        callCount++;
        onError(new Error('Invalid API key'));
      },
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
      { retry: { maxRetries: 3, baseDelayMs: 1, maxJitterMs: 0 } },
    );

    const results = await runner.runPrompt('Test', [
      { provider: 'openai', model: 'gpt-4o' },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].error).toBe('Invalid API key');
    expect(callCount).toBe(1);
  });

  it('does not re-apply stagger delay on retry', async () => {
    // Track timestamps per model so we can measure retry gap for index 1
    const callTimestampsByModel: Record<string, number[]> = {};
    const callCountByModel: Record<string, number> = {};

    const provider = buildProvider({
      onStream: async (_prompt, model, _onChunk, onComplete, onError) => {
        callCountByModel[model] = (callCountByModel[model] ?? 0) + 1;
        (callTimestampsByModel[model] ??= []).push(Date.now());

        if (model === 'gpt-4o-mini' && callCountByModel[model] === 1) {
          // First call for the second model (index 1) fails with retryable error
          onError(new Error('Rate limit exceeded'));
          return;
        }
        // All other calls succeed
        onComplete('ok', 5, 20);
      },
      models: [
        { id: 'gpt-4o', costPer1kTokens: 0.01 },
        { id: 'gpt-4o-mini', costPer1kTokens: 0.005 },
      ],
    });

    const staggerMs = 100;
    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
      {
        requestDelayMs: staggerMs,
        retry: { maxRetries: 2, baseDelayMs: 1, maxJitterMs: 0 },
      },
    );

    const results = await runner.runPrompt('Test', [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].content).toBe('ok');
    expect(results[1].content).toBe('ok');
    // Model at index 0 succeeds on first try, model at index 1 fails then retries
    expect(callCountByModel['gpt-4o']).toBe(1);
    expect(callCountByModel['gpt-4o-mini']).toBe(2);

    // The retry for the second model (index 1) should happen almost immediately
    // after its first call fails — only the tiny baseDelayMs=1ms retry backoff,
    // NOT the 100ms stagger delay. If the stagger were re-applied on retry,
    // the gap would be >= staggerMs.
    const miniTimestamps = callTimestampsByModel['gpt-4o-mini'];
    const retryGap = miniTimestamps[1] - miniTimestamps[0];
    expect(retryGap).toBeLessThan(50);
  });

  it('works without retry options (backwards compatible)', async () => {
    const provider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete) => {
        onComplete('ok', 5, 20);
      },
    });

    const runner = new EnsembleRunner(
      buildRegistry({
        openai: provider,
        anthropic: provider,
        google: provider,
        xai: provider,
        deepseek: provider,
        perplexity: provider,
      }),
      'mock',
    );

    const results = await runner.runPrompt('Test', [
      { provider: 'openai', model: 'gpt-4o' },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('ok');
  });

  describe('structured final answers', () => {
    const spec = { kind: 'choice' as const, choices: ['A', 'B', 'C', 'D'] };

    it('asks generateStructured for the answer and stores it as a Final answer line', async () => {
      const generateStructured = vi.fn(async () => ({
        parsed: { reasoning: 'B is right.', answer: 'B' } as never,
        raw: '{}',
        responseTimeMs: 12,
        usage: { inputTokens: 100, outputTokens: 50 },
      }));
      const stream = vi.fn();
      const provider = { ...buildProvider({ onStream: stream }), generateStructured };
      const runner = new EnsembleRunner(buildRegistry({ openai: provider }), 'free', { temperature: 0.5 });

      const [result] = await runner.runPrompt('Q', [{ provider: 'openai', model: 'gpt-4o' }], { answer: spec });

      expect(generateStructured).toHaveBeenCalledWith('Q', 'gpt-4o', expect.objectContaining({ name: 'final_answer' }), {
        temperature: 0.5,
      });
      expect(stream).not.toHaveBeenCalled();
      expect(result.content).toBe('B is right.\n\nFinal answer: B');
      expect(result.answerSource).toBe('structured');
      expect(result.tokenCount).toBe(150);
      expect(result.estimatedCostUsd).toBeCloseTo((100 * 2.5 + 50 * 10) / 1e6, 12);
    });

    it('falls back to a streamed reply when the server rejects structured output', async () => {
      const generateStructured = vi.fn(async () => {
        throw Object.assign(new Error('response_format is not supported'), { status: 400 });
      });
      const provider = {
        ...buildProvider({
          onStream: async (_p, _m, _c, onComplete) => onComplete('Thinking.\nFinal answer: C', 9, 30),
        }),
        generateStructured,
      };
      const runner = new EnsembleRunner(buildRegistry({ openai: provider }), 'free');

      const [result] = await runner.runPrompt('Q', [{ provider: 'openai', model: 'gpt-4o' }], { answer: spec });

      expect(result.content).toBe('Thinking.\nFinal answer: C');
      expect(result.answerSource).toBe('text');
      expect(result.error).toBeUndefined();
    });

    it('reports rate limits instead of falling back', async () => {
      const generateStructured = vi.fn(async () => {
        throw Object.assign(new Error('429 Too Many Requests'), { status: 429 });
      });
      const stream = vi.fn();
      const provider = { ...buildProvider({ onStream: stream }), generateStructured };
      const runner = new EnsembleRunner(buildRegistry({ openai: provider }), 'free');

      const [result] = await runner.runPrompt('Q', [{ provider: 'openai', model: 'gpt-4o' }], { answer: spec });

      expect(result.error).toMatch(/429/);
      expect(stream).not.toHaveBeenCalled();
    });

    it('uses the raw reply when the parsed object has no answer', async () => {
      const provider = {
        ...buildProvider({ onStream: vi.fn() }),
        generateStructured: vi.fn(async () => ({ parsed: {} as never, raw: 'Final answer: D', responseTimeMs: 1 })),
      };
      const runner = new EnsembleRunner(buildRegistry({ openai: provider }), 'free');
      const [result] = await runner.runPrompt('Q', [{ provider: 'openai', model: 'gpt-4o' }], { answer: spec });
      expect(result.content).toBe('Final answer: D');
      expect(result.answerSource).toBe('text');
    });
  });

  describe('OpenAI-compatible pricing', () => {
    const provider = buildProvider({
      onStream: async (_p, _m, _c, onComplete) =>
        onComplete('ok', 5, 1500, { inputTokens: 1000, outputTokens: 500 }),
    });

    it('prices local endpoint models at zero', async () => {
      const runner = new EnsembleRunner(buildRegistry({ 'openai-compatible': provider }), 'free', {
        endpoints: [{ id: 'ollama', baseURL: 'http://localhost:11434/v1' }],
      });
      const [result] = await runner.runPrompt('Q', [{ provider: 'openai-compatible', model: 'ollama/llama3.2' }]);
      expect(result.estimatedCostUsd).toBe(0);
    });

    it('prices OpenRouter models from the shared table', async () => {
      const runner = new EnsembleRunner(buildRegistry({ 'openai-compatible': provider }), 'free', {
        endpoints: [{ id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1' }],
      });
      const [result] = await runner.runPrompt('Q', [
        { provider: 'openai-compatible', model: 'openrouter/anthropic/claude-fable-5' },
      ]);
      expect(result.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('leaves endpoints it was not told about unpriced', async () => {
      const runner = new EnsembleRunner(buildRegistry({ 'openai-compatible': provider }), 'free');
      const [result] = await runner.runPrompt('Q', [{ provider: 'openai-compatible', model: 'ollama/llama3.2' }]);
      expect(result.estimatedCostUsd).toBeUndefined();
    });
  });
});
