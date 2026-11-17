import { describe, expect, it } from 'vitest';
import { analyzeBenchmarkRuns } from './analysis.js';
import { createMarkdownReport } from './report.js';
import type { PromptRunResult } from '../types.js';

describe('createMarkdownReport', () => {
  it('renders rich analysis sections', () => {
    const runs: PromptRunResult[] = [
      {
        questionId: 'q1',
        prompt: '1+1?',
        groundTruth: '2',
        category: 'math',
        difficulty: 'easy',
        responses: [
          {
            provider: 'openai',
            model: 'gpt-4o',
            content: '2',
            responseTimeMs: 100,
            tokenCount: 12,
            estimatedCostUsd: 0.001,
          },
        ],
        consensus: { standard: '2' },
        evaluation: {
          evaluator: 'numeric',
          groundTruth: '2',
          accuracy: 1,
          results: {
            'openai:gpt-4o': { correct: true, expected: '2', predicted: '2' },
          },
        },
      },
    ];
    const analysis = analyzeBenchmarkRuns(runs, { bootstrapIterations: 100 });
    const markdown = createMarkdownReport('results.json', analysis);

    expect(markdown).toContain('# Ensemble Eval Analysis Report');
    expect(markdown).toContain('## Accuracy Summary - Models');
    expect(markdown).toContain('## Statistical Significance');
    expect(markdown).toContain('## Cost Analysis');
  });

  it('reports Wilson intervals, failures, consensus cost and a paired McNemar test for every strategy', () => {
    const runs: PromptRunResult[] = Array.from({ length: 4 }, (_, i) => ({
      questionId: `q${i}`,
      prompt: `p${i}`,
      groundTruth: 'A',
      answerProtocol: 'structured' as const,
      responses: [{ provider: 'openai' as const, model: 'm', content: 'x', responseTimeMs: 1, tokenCount: 10, estimatedCostUsd: 0.001 }],
      consensus: { standard: 'Final answer: A', majority: 'Final answer: A' },
      consensusMetrics: {
        standard: { tokenCount: 5, durationMs: 1, costUsd: 0.002 },
        majority: { tokenCount: 0, durationMs: 0, costUsd: 0, mechanical: true },
      },
      evaluation: {
        evaluator: 'mcq' as const, groundTruth: 'A', accuracy: 0,
        results: {
          'openai:m': i === 0
            ? { correct: false, expected: 'A', predicted: null, failure: 'timeout' as const }
            : { correct: i < 2, expected: 'A', predicted: 'A' },
        },
      },
      consensusEvaluation: {
        evaluator: 'mcq' as const, groundTruth: 'A',
        results: {
          standard: { correct: true, expected: 'A', predicted: 'A' },
          majority: i === 3
            ? { correct: false, expected: 'A', predicted: null, failure: 'error' as const }
            : { correct: true, expected: 'A', predicted: 'A' },
        },
      },
    }));
    const analysis = analyzeBenchmarkRuns(runs, { bootstrapIterations: 50 });
    const model = analysis.modelAccuracy.find((row) => row.label === 'openai:m')!;
    expect(model).toMatchObject({ correct: 1, total: 4, timeouts: 1, errors: 0 });
    expect(model.lower).toBeLessThan(0.25);
    expect(model.upper).toBeGreaterThan(0.25);
    expect(analysis.strategyAccuracy.find((row) => row.label === 'majority')).toMatchObject({ correct: 3, errors: 1 });
    expect(analysis.comparisons.map((c) => c.strategy).sort()).toEqual(['majority', 'standard']);
    const standard = analysis.comparisons.find((c) => c.strategy === 'standard')!;
    expect(standard.mcnemar.method).toBe('exact');
    expect(standard.mcnemar.pValue).toBeCloseTo(0.25, 10);
    const standardCost = analysis.costAnalysis.find((row) => row.label === 'strategy:standard')!;
    expect(standardCost.totalEstimatedCostUsd).toBeCloseTo(4 * 0.003, 10);

    const markdown = createMarkdownReport('results.json', analysis);
    expect(markdown).toContain('| Label | Accuracy | 95% CI | Correct / Total | Errors | Timeouts |');
    expect(markdown).toContain('| openai:m | 25.00% | [');
    expect(markdown).toContain('standard vs openai:m');
    expect(markdown).toContain('exact');
    expect(markdown).toContain('Answer protocol: structured');
    expect(markdown).not.toMatch(/[\u2013\u2014]/);
  });
  it('shows costs with unpriced calls as a lower bound or unknown, never as free', () => {
    const runs: PromptRunResult[] = [
      {
        questionId: 'q1', prompt: 'p', groundTruth: 'A',
        responses: [
          { provider: 'openai', model: 'priced', content: 'A', responseTimeMs: 1, estimatedCostUsd: 0.001 },
          { provider: 'openai-compatible', model: 'openrouter/unpriced', content: 'A', responseTimeMs: 1 },
        ],
        consensus: { standard: 'A' },
        consensusMetrics: { standard: { tokenCount: 5, durationMs: 1 } },
        evaluation: {
          evaluator: 'mcq', groundTruth: 'A', accuracy: 1,
          results: {
            'openai:priced': { correct: true, expected: 'A', predicted: 'A' },
            'openai-compatible:openrouter/unpriced': { correct: true, expected: 'A', predicted: 'A' },
          },
        },
        consensusEvaluation: {
          evaluator: 'mcq', groundTruth: 'A', results: { standard: { correct: true, expected: 'A', predicted: 'A' } },
        },
      },
    ];
    const analysis = analyzeBenchmarkRuns(runs, { bootstrapIterations: 10 });
    expect(analysis.costAnalysis.find((row) => row.label === 'strategy:standard')?.unpricedCalls).toBe(2);
    const markdown = createMarkdownReport('results.json', analysis);
    expect(markdown).toContain('| openai-compatible:openrouter/unpriced | 0 | unknown (1 unpriced call) |');
    expect(markdown).toContain('| openai:priced | 0 | $0.0010 | $0.0010 |');
    expect(markdown).toContain('| strategy:standard | 5 | >= $0.0010 (2 unpriced calls) |');
  });
});
