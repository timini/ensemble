import type {
  AIProvider,
  ProviderRegistry,
} from '@ensemble-ai/shared-utils/providers';
import { describe, expect, it } from 'vitest';
import { EnsembleRunner } from './ensembleRunner.js';
import type { EvalProvider } from '../types.js';

function buildProvider(args: {
  onStream: AIProvider['streamResponse'];
  models?: Array<{ id: string; costPer1kTokens: number }>;
}): AIProvider {
  return {
    streamResponse: args.onStream,
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
});
