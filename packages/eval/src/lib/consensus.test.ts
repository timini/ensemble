import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import { describe, expect, it } from 'vitest';
import { generateConsensus, parseStrategies } from './consensus.js';
import type { ProviderResponse } from '../types.js';

function buildProvider(onStream: AIProvider['streamResponse']): AIProvider {
  return {
    streamResponse: onStream,
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
      'Invalid strategy "unknown". Expected one of: standard, elo, majority.',
    );
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
    expect(insufficient.majority).toContain('requires at least 2');

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

    expect(sufficient.majority).toBe('majority answer');
  });
});
