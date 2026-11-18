import { afterEach, describe, expect, it, vi } from 'vitest';
import { printResults } from './quickEvalOutput.js';
import type { PromptRunResult } from '../types.js';

function run(id: string, single: boolean, majority: boolean | null): PromptRunResult {
  return {
    questionId: id,
    prompt: id,
    responses: [{ provider: 'openai', model: 'm', content: 'x', responseTimeMs: 1, estimatedCostUsd: 0.001 }],
    consensus: {},
    evaluation: {
      evaluator: 'mcq', groundTruth: 'A', accuracy: single ? 1 : 0,
      results: { 'openai:m': { correct: single, expected: 'A', predicted: 'A' } },
    },
    ...(majority === null
      ? {}
      : {
          consensusEvaluation: {
            evaluator: 'mcq' as const, groundTruth: 'A',
            results: { majority: { correct: majority, expected: 'A', predicted: null, ...(majority ? {} : { failure: 'timeout' as const }) } },
          },
          consensusMetrics: { majority: { tokenCount: 5, durationMs: 1, costUsd: 0.01 } },
        }),
  };
}

describe('printResults', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prints Wilson intervals, a paired McNemar test, failures and consensus cost', () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      out.push(String(s));
      return true;
    });
    const singleRuns = [run('q1', true, null), run('q2', false, null), run('q3', false, null)];
    const ensembleRuns = [run('q1', true, true), run('q2', false, true), run('q3', false, false)];
    printResults('openai:m', 3, ['majority'], [{ dataset: 'arc', singleRuns, ensembleRuns }], 1000);
    const text = out.join('');

    expect(text).toContain('33.3% (1/3) 95% CI [');
    expect(text).toContain('66.7% (2/3) 95% CI [');
    expect(text).toContain('failed: 0 error(s), 1 timeout(s) (counted wrong)');
    expect(text).toContain('McNemar vs single: n=3 single-only=0 ensemble-only=1 p=1.000 (exact)');
    expect(text).toContain('cost: $0.0330');
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
  it('never shows unpriced calls as free', () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      out.push(String(s));
      return true;
    });
    const unpriced = (r: PromptRunResult): PromptRunResult => ({
      ...r,
      responses: r.responses.map(({ estimatedCostUsd: _cost, ...rest }) => rest),
    });
    const singleRuns = [unpriced(run('q1', true, null))];
    const ensembleRuns = [run('q1', true, true), unpriced(run('q2', true, true))];
    printResults('openai:m', 3, ['majority'], [{ dataset: 'arc', singleRuns, ensembleRuns }], 1000);
    const text = out.join('');

    expect(text).toContain('cost: unknown (1 unpriced call)');
    expect(text).toContain('cost: >= $0.0210 (1 unpriced call)');
    expect(text).not.toContain('cost: $0.0000');
  });
});
