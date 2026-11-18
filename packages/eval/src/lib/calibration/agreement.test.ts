import { describe, expect, it } from 'vitest';
import type { BenchmarkResultsFile, PromptRunResult } from '../../types.js';
import { answerPairs, fitAgreementThresholds, rocAuc, sameFinalAnswer, type ScoredPair } from './agreement.js';

function run(predicted: Array<string | null>, errorAt = -1): PromptRunResult {
  return {
    questionId: 'q1',
    prompt: 'p',
    consensus: {},
    responses: predicted.map((_, i) => ({
      provider: 'openai-compatible', model: `m${i}`, content: `answer ${i}`, responseTimeMs: 1,
      ...(i === errorAt ? { error: 'boom' } : {}),
    })),
    evaluation: {
      evaluator: 'mcq', groundTruth: 'A', accuracy: 0,
      results: Object.fromEntries(predicted.map((p, i) => [
        `openai-compatible:m${i}`, { correct: p === 'A', expected: 'A', predicted: p },
      ])),
    },
  };
}

const file = (runs: PromptRunResult[]): BenchmarkResultsFile => ({
  type: 'benchmark', dataset: 'gpqa', mode: 'mock', models: [], strategies: [], sampleSize: runs.length,
  createdAt: '', updatedAt: '', runs,
});

describe('sameFinalAnswer', () => {
  it('compares letters without case and numbers by value', () => {
    expect(sameFinalAnswer('b', 'B')).toBe(true);
    expect(sameFinalAnswer('1,000', '1000.0')).toBe(true);
    expect(sameFinalAnswer('A', 'C')).toBe(false);
  });
});

describe('answerPairs', () => {
  it('pairs every two readable answers to a question and labels them', () => {
    const pairs = answerPairs([file([run(['A', 'a', 'C'])])]);
    expect(pairs.map((p) => [p.a, p.b, p.agree])).toEqual([
      ['openai-compatible:m0', 'openai-compatible:m1', true],
      ['openai-compatible:m0', 'openai-compatible:m2', false],
      ['openai-compatible:m1', 'openai-compatible:m2', false],
    ]);
    expect(pairs[0]!.textA).toBe('answer 0');
    expect(pairs[0]!.questionId).toBe('gpqa/q1');
  });

  it('leaves out failed and unreadable answers', () => {
    expect(answerPairs([file([run(['A', null, 'A'], 2)])])).toHaveLength(0);
  });
});

describe('rocAuc', () => {
  it('is 1 when every agreeing pair scores above every disagreeing pair', () => {
    expect(rocAuc([{ cosine: 0.9, agree: true }, { cosine: 0.2, agree: false }])).toBe(1);
    expect(rocAuc([{ cosine: 0.5, agree: true }, { cosine: 0.5, agree: false }])).toBe(0.5);
  });
});

describe('fitAgreementThresholds', () => {
  const points: ScoredPair[] = [
    ...Array.from({ length: 20 }, (_, i) => ({ cosine: 0.6 + i * 0.01, agree: true })),
    ...Array.from({ length: 20 }, (_, i) => ({ cosine: 0.2 + i * 0.01, agree: false })),
    { cosine: 0.65, agree: false },
    { cosine: 0.3, agree: true },
  ];

  it('puts medium where the labels separate and high where agreement is reliable', () => {
    const fit = fitAgreementThresholds(points);
    expect(fit.medium).toBeGreaterThan(0.39);
    expect(fit.medium).toBeLessThanOrEqual(0.6);
    expect(fit.high).toBeGreaterThanOrEqual(fit.medium);
    const above = points.filter((p) => p.cosine > fit.high);
    expect(above.filter((p) => p.agree).length / above.length).toBeGreaterThanOrEqual(0.9);
    expect(fit).toMatchObject({ pairs: 42, agreePairs: 21, disagreePairs: 21 });
    expect(fit.auc).toBeGreaterThan(0.9);
  });

  it('refuses to fit with too few pairs of either label', () => {
    expect(() => fitAgreementThresholds(points.filter((p) => p.agree))).toThrow(/Not enough pairs/);
  });
});
