import { computeMcNemar, computePairedBootstrapDelta } from './statistics.js';
import type { ComparisonStats } from './analysisTypes.js';
import type { QuestionSummary } from './analysisAggregates.js';

interface PairedOutcome {
  modelCorrect: boolean;
  strategyCorrect: boolean;
}

function extractPairs(
  questions: QuestionSummary[],
  model: string,
  strategy: string,
): PairedOutcome[] {
  return questions
    .map((question) => {
      const modelResult = question.modelResults[model];
      const strategyResult = question.strategyResults[strategy];
      if (!modelResult || !strategyResult || strategyResult.correct === null) {
        return null;
      }
      return {
        modelCorrect: modelResult.correct,
        strategyCorrect: strategyResult.correct,
      };
    })
    .filter((value): value is PairedOutcome => Boolean(value));
}

export function buildComparisonStats(
  questions: QuestionSummary[],
  primaryStrategy: string | null,
  models: string[],
  bootstrapIterations: number,
): ComparisonStats[] {
  if (!primaryStrategy) {
    return [];
  }

  const comparisons: ComparisonStats[] = [];
  for (const model of models) {
    const pairs = extractPairs(questions, model, primaryStrategy);
    if (pairs.length === 0) {
      continue;
    }
    comparisons.push({
      comparedAgainst: model,
      sampleSize: pairs.length,
      mcnemar: computeMcNemar(pairs),
      bootstrap: {
        ...computePairedBootstrapDelta(pairs, bootstrapIterations),
        iterations: bootstrapIterations,
      },
    });
  }

  return comparisons;
}
