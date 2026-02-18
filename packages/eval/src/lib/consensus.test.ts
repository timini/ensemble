import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import { describe, expect, it } from 'vitest';
import { generateConsensus, parseStrategies } from './consensus.js';
import type { ProviderResponse } from '../types.js';

function buildProvider(onStream: AIProvider['streamResponse']): AIProvider {
  return {
    streamResponse: onStream,
    generateStructured: async () => ({ parsed: {} as never, raw: '{}', responseTimeMs: 0 }),
    generateEmbeddings: async () => [],
    validateApiKey: async () => ({ valid: true }),
    listAvailableModels: () => [],
    listAvailableTextModels: async () => [],
  };
}

describe('consensus', () => {
  it('parses majority strategy and rejects unknown strategy values', () => {
    expect(parseStrategies(['standard,majority', 'elo'])).toEqual([
      'standard',
      'majority',
      'elo',
    ]);
    expect(() => parseStrategies(['unknown'])).toThrow(
      'Invalid strategy "unknown". Expected one of: standard, elo, majority, council.',
    );
  });

  it('handles homogeneous ensemble (identical model IDs) gracefully', async () => {
    let receivedResponses: Array<{ modelId: string; modelName: string }> = [];
    const provider = buildProvider(async (_prompt, _model, _onChunk, onComplete) => {
      onComplete('consensus output', 5, 20);
    });

    const { StandardConsensus } = await import(
      '@ensemble-ai/shared-utils/consensus/StandardConsensus'
    );
    const origFn = StandardConsensus.prototype.generateConsensus;
    StandardConsensus.prototype.generateConsensus = async function (
      responses: Array<{ modelId: string; modelName: string; content: string }>,
      ...rest: unknown[]
    ) {
      receivedResponses = responses.map((r) => ({ modelId: r.modelId, modelName: r.modelName }));
      return origFn.call(this, responses, ...(rest as [number, string]));
    };

    const responses: ProviderResponse[] = [
      { provider: 'google', model: 'gemini-2.0-flash', content: 'A', responseTimeMs: 5 },
      { provider: 'google', model: 'gemini-2.0-flash', content: 'B', responseTimeMs: 6 },
      { provider: 'google', model: 'gemini-2.0-flash', content: 'C', responseTimeMs: 7 },
    ];

    const result = await generateConsensus(['standard'], 'Q', responses, provider, 'gemini-2.0-flash');

    expect(result.outputs.standard).toBeDefined();
    expect(result.metrics.standard).toBeDefined();
    expect(result.metrics.standard!.tokenCount).toBeGreaterThanOrEqual(0);
    expect(result.metrics.standard!.durationMs).toBeGreaterThanOrEqual(0);
    expect(receivedResponses).toHaveLength(3);
    const ids = receivedResponses.map((r) => r.modelId);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('gemini-2.0-flash');
    expect(ids[1]).toBe('gemini-2.0-flash#2');
    expect(ids[2]).toBe('gemini-2.0-flash#3');

    StandardConsensus.prototype.generateConsensus = origFn;
  });

  it('omits ELO key when fewer than 3 responses are available', async () => {
    const result = await generateConsensus(
      ['elo'],
      'Q',
      [
        { provider: 'openai', model: 'a', content: 'A', responseTimeMs: 5 },
        { provider: 'anthropic', model: 'b', content: 'B', responseTimeMs: 6 },
      ],
      buildProvider(async () => undefined),
      'judge-model',
    );
    expect(result.outputs.elo).toBeUndefined();
  });

  it('handles majority strategy for insufficient and sufficient response counts', async () => {
    const insufficient = await generateConsensus(
      ['majority'],
      'Q',
      [
        {
          provider: 'openai',
          model: 'a',
          content: 'A',
          responseTimeMs: 5,
        },
      ],
      buildProvider(async () => undefined),
      'judge-model',
    );
    expect(insufficient.outputs.majority).toBeUndefined();

    let callCount = 0;
    const provider = buildProvider(async (_prompt, _model, _onChunk, onComplete) => {
      callCount += 1;
      if (callCount === 1) {
        onComplete(
          JSON.stringify({
            rankings: [
              { modelId: 'a', alignmentScore: 90 },
              { modelId: 'b', alignmentScore: 80 },
            ],
          }),
          5,
          20,
        );
        return;
      }
      onComplete('majority answer', 5, 20);
    });
    const responses: ProviderResponse[] = [
      { provider: 'openai', model: 'a', content: 'A', responseTimeMs: 5 },
      { provider: 'anthropic', model: 'b', content: 'B', responseTimeMs: 6 },
    ];
    const sufficient = await generateConsensus(
      ['majority'],
      'Q',
      responses,
      provider,
      'judge-model',
    );

    expect(sufficient.outputs.majority).toBe('majority answer');
    expect(sufficient.metrics.majority).toBeDefined();
    expect(sufficient.metrics.majority!.tokenCount).toBe(40);
  });
});
