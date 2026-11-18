import { describe, expect, it, vi } from 'vitest';
import type { AIProvider, TokenUsage } from '../providers/types';
import { withUsageTracking } from './usageTracking';
import type { CallUsage } from './runCost';

function fakeProvider(usage?: TokenUsage): AIProvider {
  return {
    streamResponse: vi.fn(async (_prompt, _model, onChunk, onComplete) => {
      onChunk('abcd');
      onComplete('abcdabcd', 5, undefined, usage);
    }),
    generateEmbeddings: vi.fn(async () => [1, 2]),
    validateApiKey: vi.fn(async () => ({ valid: true })),
    listAvailableModels: vi.fn(() => []),
    listAvailableTextModels: vi.fn(async () => []),
    generateStructured: vi.fn(async () => ({ parsed: { ok: true }, raw: '{"ok":true}', responseTimeMs: 1 })),
  } as unknown as AIProvider;
}

describe('withUsageTracking', () => {
  it('records reported usage from the stream and passes callbacks through', async () => {
    const calls: CallUsage[] = [];
    const usage = { inputTokens: 7, outputTokens: 3 };
    const tracked = withUsageTracking(fakeProvider(usage), 'openai', (c) => calls.push(c));
    const onChunk = vi.fn();
    const onComplete = vi.fn();

    await tracked.streamResponse('prompt', 'gpt-x', onChunk, onComplete, vi.fn());

    expect(onChunk).toHaveBeenCalledWith('abcd');
    expect(onComplete).toHaveBeenCalledWith('abcdabcd', 5, undefined, usage);
    expect(calls).toEqual([
      { provider: 'openai', modelId: 'gpt-x', inputTokens: 7, outputTokens: 3, source: 'reported' },
    ]);
  });

  it('estimates usage from text when the provider reports none', async () => {
    const calls: CallUsage[] = [];
    const tracked = withUsageTracking(fakeProvider(), 'xai', (c) => calls.push(c));

    await tracked.streamResponse('a'.repeat(40), 'grok', vi.fn(), vi.fn(), vi.fn());

    expect(calls).toEqual([
      { provider: 'xai', modelId: 'grok', inputTokens: 10, outputTokens: 2, source: 'estimated' },
    ]);
  });

  it('records structured calls and delegates the other methods', async () => {
    const calls: CallUsage[] = [];
    const inner = fakeProvider();
    const tracked = withUsageTracking(inner, 'google', (c) => calls.push(c));

    await tracked.generateStructured('abcd', 'gem', { name: 's', schema: {} });
    await tracked.validateApiKey('k');

    expect(calls[0]).toMatchObject({ provider: 'google', modelId: 'gem', source: 'estimated', inputTokens: 1 });
    expect(inner.validateApiKey).toHaveBeenCalledWith('k');
  });
});
