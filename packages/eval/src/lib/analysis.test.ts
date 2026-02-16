import { describe, expect, it } from 'vitest';
import { analyzeBenchmarkRuns } from './analysis.js';
import type { PromptRunResult } from '../types.js';

function makeRun(args: {
  id: string;
  prompt: string;
  groundTruth: string;
  modelA: { predicted: string; correct: boolean };
  modelB: { predicted: string; correct: boolean };
  strategyAnswer: string;
  category: string;
  difficulty: string;
}): PromptRunResult {
  return {
    questionId: args.id,
    prompt: args.prompt,
    groundTruth: args.groundTruth,
    category: args.category,
    difficulty: args.difficulty,
    responses: [
      {
        provider: 'openai',
        model: 'gpt-4o',
        content: args.modelA.predicted,
        responseTimeMs: 10,
        tokenCount: 100,
        estimatedCostUsd: 0.001,
      },
      {
        provider: 'anthropic',
        model: 'claude',
        content: args.modelB.predicted,
        responseTimeMs: 12,
        tokenCount: 90,
        estimatedCostUsd: 0.002,
      },
    ],
    consensus: {
      standard: args.strategyAnswer,
    },
    evaluation: {
      evaluator: 'numeric',
      groundTruth: args.groundTruth,
      accuracy: 0,
      results: {
        'openai:gpt-4o': {
          predicted: args.modelA.predicted,
          expected: args.groundTruth,
          correct: args.modelA.correct,
        },
        'anthropic:claude': {
          predicted: args.modelB.predicted,
          expected: args.groundTruth,
          correct: args.modelB.correct,
        },
      },
    },
  };
}

describe('analyzeBenchmarkRuns', () => {
  it('builds model/strategy accuracy, stats, and chart payloads', () => {
    const analysis = analyzeBenchmarkRuns(
      [
        makeRun({
          id: 'q1',
          prompt: 'one',
          groundTruth: '1',
          modelA: { predicted: '1', correct: true },
          modelB: { predicted: '0', correct: false },
          strategyAnswer: '1',
          category: 'math',
          difficulty: 'easy',
        }),
        makeRun({
          id: 'q2',
          prompt: 'two',
          groundTruth: '2',
          modelA: { predicted: '0', correct: false },
          modelB: { predicted: '0', correct: false },
          strategyAnswer: '2',
          category: 'math',
          difficulty: 'hard',
        }),
        makeRun({
          id: 'q3',
          prompt: 'three',
          groundTruth: '3',
          modelA: { predicted: '3', correct: true },
          modelB: { predicted: '3', correct: true },
          strategyAnswer: '0',
          category: 'science',
          difficulty: 'hard',
        }),
      ],
      { bootstrapIterations: 200 },
    );

    expect(analysis.primaryStrategy).toBe('standard');
    expect(analysis.modelAccuracy.map((row) => row.label)).toEqual([
      'openai:gpt-4o',
      'anthropic:claude',
    ]);
    expect(analysis.strategyAccuracy[0]).toMatchObject({
      label: 'standard',
      correct: 2,
      total: 3,
    });
    expect(analysis.comparisons).not.toHaveLength(0);
    expect(analysis.notableExamples.map((example) => example.questionId)).toContain('q2');
    expect(analysis.charts.costVsAccuracyFrontier.length).toBeGreaterThanOrEqual(3);
    expect(analysis.charts.modelDiversityHeatmap.models).toHaveLength(2);
  });

  it('uses pre-computed consensusEvaluation when present', () => {
    const run: PromptRunResult = {
      questionId: 'q1',
      prompt: 'one',
      groundTruth: '1',
      category: 'math',
      difficulty: 'easy',
      responses: [
        {
          provider: 'openai',
          model: 'gpt-4o',
          content: '1',
          responseTimeMs: 10,
          tokenCount: 100,
          estimatedCostUsd: 0.001,
        },
      ],
      consensus: {
        standard: 'summarized answer',
      },
      evaluation: {
        evaluator: 'generative',
        groundTruth: '1',
        accuracy: 1,
        results: {
          'openai:gpt-4o': { predicted: '1', expected: '1', correct: true },
        },
      },
      consensusEvaluation: {
        evaluator: 'generative',
        groundTruth: '1',
        results: {
          standard: { predicted: 'summarized answer', expected: '1', correct: true },
        },
      },
    };

    const analysis = analyzeBenchmarkRuns([run], { bootstrapIterations: 50 });

    expect(analysis.strategyAccuracy[0]).toMatchObject({
      label: 'standard',
      correct: 1,
      total: 1,
    });
  });
});
