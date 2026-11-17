import { describe, expect, it } from 'vitest';
import { estimateRun, ESTIMATE_TOKENS } from './estimateRun';
import type { ModelRef, PriceTable } from './types';

const table: PriceTable = {
  source: 'test',
  fetchedAt: '2026-11-16',
  models: {
    'openai/a': { inputPerMillion: 1, outputPerMillion: 2, openRouterId: 'openai/a' },
    'openai/b': { inputPerMillion: 3, outputPerMillion: 6, openRouterId: 'openai/b' },
    'openai/text-embedding-3-small': {
      inputPerMillion: 0.02,
      outputPerMillion: 0,
      openRouterId: 'openai/text-embedding-3-small',
    },
  },
};

const models = (n: number): ModelRef[] =>
  Array.from({ length: n }, () => ({ provider: 'openai', modelId: 'a' }));
const summarizer: ModelRef = { provider: 'openai', modelId: 'b' };
const embeddings: ModelRef = { provider: 'openai', modelId: 'text-embedding-3-small' };

const run = (method: 'standard' | 'majority' | 'elo' | 'council', n: number) =>
  estimateRun({
    models: models(n),
    consensusMethod: method,
    summarizer,
    eloTopN: 3,
    embeddings,
    promptTokens: 100,
    table,
  });

describe('estimateRun', () => {
  const expectedConsensus: Record<string, (number | null)[]> = {
    // index = N, null where the method cannot run
    standard: [null, null, 1, 1, 1, 1, 1],
    majority: [null, null, 2, 2, 2, 2, 2],
    elo: [null, null, 0, 7, 13, 21, 31],
    council: [null, null, 0, 19, 35, 56, 82],
  };

  for (const method of ['standard', 'majority', 'elo', 'council'] as const) {
    for (let n = 2; n <= 6; n++) {
      it(`${method} with ${n} models counts answers, consensus and embedding calls`, () => {
        const estimate = run(method, n);
        const consensus = expectedConsensus[method]![n]!;
        expect(estimate.calls.answers).toBe(n);
        expect(estimate.calls.embeddings).toBe(n);
        expect(estimate.calls.consensus).toBe(consensus);
        expect(estimate.calls.total).toBe(n + n + consensus);
        expect(estimate.consensusAvailable).toBe(consensus > 0);
        expect(estimate.cost.lowUsd).toBeGreaterThan(0);
        expect(estimate.cost.highUsd).toBeGreaterThan(estimate.cost.lowUsd);
        expect(estimate.cost.unpricedModels).toEqual([]);
      });
    }
  }

  it('prices a standard run from the token assumptions', () => {
    const estimate = estimateRun({
      models: models(2),
      consensusMethod: 'standard',
      summarizer,
      eloTopN: 3,
      embeddings: null,
      promptTokens: 100,
      table,
    });
    const { answer, overhead } = ESTIMATE_TOKENS;
    // Two answers by model a, then one synthesis by model b reading both.
    const expected = (a: number) =>
      (2 * (100 * 1 + a * 2) + ((overhead + 100 + 2 * a) * 3 + a * 6)) / 1_000_000;
    expect(estimate.cost.lowUsd).toBeCloseTo(expected(answer.low), 12);
    expect(estimate.cost.highUsd).toBeCloseTo(expected(answer.high), 12);
    expect(estimate.calls.embeddings).toBe(0);
  });

  it('lists models without a price and leaves them out of the cost', () => {
    const estimate = estimateRun({
      models: [
        { provider: 'openai', modelId: 'a' },
        { provider: 'xai', modelId: 'unknown-model' },
      ],
      consensusMethod: 'standard',
      summarizer,
      eloTopN: 3,
      embeddings: { provider: 'google', modelId: 'no-price' },
      promptTokens: 100,
      table,
    });
    expect(estimate.cost.unpricedModels).toEqual(['xai/unknown-model', 'google/no-price']);
    expect(estimate.cost.lowUsd).toBeGreaterThan(0);
  });

  it('uses the first model as summarizer when none is set', () => {
    const estimate = estimateRun({
      models: [{ provider: 'xai', modelId: 'unknown-model' }, ...models(1)],
      consensusMethod: 'standard',
      summarizer: null,
      eloTopN: 3,
      embeddings: null,
      promptTokens: 10,
      table,
    });
    expect(estimate.cost.unpricedModels).toEqual(['xai/unknown-model']);
  });

  it('counts manual answers for consensus but makes no calls for them', () => {
    const estimate = estimateRun({
      models: models(2),
      manualResponseCount: 1,
      consensusMethod: 'elo',
      summarizer,
      eloTopN: 3,
      embeddings,
      promptTokens: 10,
      table,
    });
    expect(estimate.calls.answers).toBe(2);
    expect(estimate.calls.consensus).toBe(7);
    expect(estimate.calls.embeddings).toBe(2);
  });

  it('gives the council minimum when only one branch survives judgment', () => {
    expect(run('council', 5).calls.consensusMin).toBe(46);
  });

  it('returns zero calls and zero cost with no models', () => {
    const estimate = run('standard', 0);
    expect(estimate.calls.total).toBe(0);
    expect(estimate.cost).toEqual({ lowUsd: 0, highUsd: 0, unpricedModels: [] });
  });
});
