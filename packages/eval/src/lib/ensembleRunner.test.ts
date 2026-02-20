import type {
  AIProvider,
  ProviderRegistry,
  StreamResponseOptions,
} from '@ensemble-ai/shared-utils/providers';
import { describe, expect, it } from 'vitest';
import { EnsembleRunner } from './ensembleRunner.js';
import type { EvalProvider } from '../types.js';

function buildProvider(args: {
  onStream: (
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void,
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

function buildRegistry(providers: Record<EvalProvider, AIProvider>): ProviderRegistry {
  return {
    getProvider: (provider: EvalProvider) => providers[provider],
  } as unknown as ProviderRegistry;
}

describe('EnsembleRunner', () => {
  it('collects responses, estimates costs, and keeps failed model runs', async () => {
    const openaiProvider = buildProvider({
      onStream: async (_prompt, _model, _onChunk, onComplete) => {
        onComplete('openai answer', 40, 1200);
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
    expect(results[0].estimatedCostUsd).toBeCloseTo(0.012, 10);
    expect(results[1]).toMatchObject({
      provider: 'anthropic',
      model: 'claude',
      error: 'provider error',
    });
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
});
