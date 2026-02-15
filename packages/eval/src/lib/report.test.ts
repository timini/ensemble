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
});
