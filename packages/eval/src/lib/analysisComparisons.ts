import { computeMcNemar, computePairedBootstrapDelta } from './statistics.js';
import { comparePaired } from './pairedStats.js';
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

/** Paired comparison of every strategy against every model on the questions both answered. */
export function buildComparisonStats(
  questions: QuestionSummary[],
  strategies: string[],
  models: string[],
  bootstrapIterations: number,
): ComparisonStats[] {
  const comparisons: ComparisonStats[] = [];
  for (const strategy of strategies) {
    for (const model of models) {
      const pairs = extractPairs(questions, model, strategy);
      if (pairs.length === 0) {
        continue;
      }
      const paired = comparePaired(pairs);
      comparisons.push({
        strategy,
        comparedAgainst: model,
        sampleSize: pairs.length,
        mcnemar: { ...computeMcNemar(pairs), pValue: paired.pValue, method: paired.method },
        bootstrap: {
          ...computePairedBootstrapDelta(pairs, bootstrapIterations),
          iterations: bootstrapIterations,
        },
      });
    }
  }

  return comparisons;
}
