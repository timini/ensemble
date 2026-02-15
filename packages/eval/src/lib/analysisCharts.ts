import type { ChartBundle } from './analysisTypes.js';
import { safeRatio } from './analysisHelpers.js';

interface QuestionForCharts {
  modelResults: Record<string, { predicted: string | null; correct: boolean }>;
  strategyResults: Record<string, { correct: boolean | null }>;
}

export function buildModelDiversityHeatmap(
  questions: QuestionForCharts[],
  models: string[],
): { models: string[]; matrix: number[][] } {
  const matrix = models.map(() => models.map(() => 1));

  for (let i = 0; i < models.length; i += 1) {
    for (let j = i + 1; j < models.length; j += 1) {
      const leftModel = models[i];
      const rightModel = models[j];

      let compared = 0;
      let matches = 0;
      for (const question of questions) {
        const left = question.modelResults[leftModel]?.predicted;
        const right = question.modelResults[rightModel]?.predicted;
        if (!left || !right) {
          continue;
        }

        compared += 1;
        if (left.trim().toUpperCase() === right.trim().toUpperCase()) {
          matches += 1;
        }
      }

      const agreement = safeRatio(matches, compared);
      matrix[i][j] = agreement;
      matrix[j][i] = agreement;
    }
  }

  return { models, matrix };
}

export function buildRightAnswerAlwaysThereStats(
  questions: QuestionForCharts[],
  primaryStrategy: string | null,
): ChartBundle['rightAnswerAlwaysThere'] {
  let alwaysThereCount = 0;
  let recoveredByEnsembleCount = 0;
  let missedDespiteAvailabilityCount = 0;
  let ensembleSolvedWhenAllFailedCount = 0;

  for (const question of questions) {
    const modelCorrect = Object.values(question.modelResults).map((entry) => entry.correct);
    const atLeastOneCorrect = modelCorrect.some(Boolean);
    const strategyCorrect = primaryStrategy
      ? question.strategyResults[primaryStrategy]?.correct ?? null
      : null;

    if (atLeastOneCorrect) {
      alwaysThereCount += 1;
      if (strategyCorrect === true) {
        recoveredByEnsembleCount += 1;
      } else if (strategyCorrect === false) {
        missedDespiteAvailabilityCount += 1;
      }
    } else if (strategyCorrect === true) {
      ensembleSolvedWhenAllFailedCount += 1;
    }
  }

  return {
    totalQuestions: questions.length,
    alwaysThereCount,
    recoveredByEnsembleCount,
    missedDespiteAvailabilityCount,
    ensembleSolvedWhenAllFailedCount,
  };
}
