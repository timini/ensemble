import type { PromptRunResult } from '../types.js';
import { safeRatio } from './analysisHelpers.js';
import type {
  AccuracyRow,
  AgreementCalibrationRow,
  BreakdownRow,
  CostRow,
} from './analysisTypes.js';
import type {
  AccuracyCounter,
  AgreementCounter,
  CostCounter,
  QuestionSummary,
} from './analysisAggregates.js';

export function toAccuracyRows(map: Map<string, AccuracyCounter>): AccuracyRow[] {
  return [...map.entries()]
    .map(([label, value]) => ({
      label,
      correct: value.correct,
      total: value.total,
      accuracy: safeRatio(value.correct, value.total),
    }))
    .sort(
      (left, right) =>
        right.accuracy - left.accuracy || left.label.localeCompare(right.label),
    );
}

export function buildBreakdownRows(
  key: 'category' | 'difficulty',
  questions: QuestionSummary[],
  primaryStrategy: string | null,
): BreakdownRow[] {
  const grouped = new Map<string, QuestionSummary[]>();
  for (const question of questions) {
    const groupKey = key === 'category' ? question.category : question.difficulty;
    const bucket = grouped.get(groupKey) ?? [];
    bucket.push(question);
    grouped.set(groupKey, bucket);
  }

  return [...grouped.entries()]
    .map(([groupKey, groupQuestions]) => {
      let bestModelAccuracy = 0;
      const models = new Set(groupQuestions.flatMap((question) => Object.keys(question.modelResults)));
      for (const model of models) {
        let correct = 0;
        let total = 0;
        for (const question of groupQuestions) {
          const result = question.modelResults[model];
          if (!result) {
            continue;
          }
          total += 1;
          correct += result.correct ? 1 : 0;
        }
        bestModelAccuracy = Math.max(bestModelAccuracy, safeRatio(correct, total));
      }

      let ensembleCorrect = 0;
      let ensembleTotal = 0;
      if (primaryStrategy) {
        for (const question of groupQuestions) {
          const strategy = question.strategyResults[primaryStrategy];
          if (!strategy || strategy.correct === null) {
            continue;
          }
          ensembleTotal += 1;
          ensembleCorrect += strategy.correct ? 1 : 0;
        }
      }
      const ensembleAccuracy = safeRatio(ensembleCorrect, ensembleTotal);

      return {
        key: groupKey,
        sampleSize: groupQuestions.length,
        bestModelAccuracy,
        ensembleAccuracy,
        lift: ensembleAccuracy - bestModelAccuracy,
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function buildAgreementRows(
  bins: Map<string, AgreementCounter>,
): AgreementCalibrationRow[] {
  return [...bins.entries()]
    .map(([level, value]) => ({
      level,
      ratio: value.ratio,
      correct: value.correct,
      total: value.total,
      accuracy: safeRatio(value.correct, value.total),
    }))
    .sort((left, right) => left.ratio - right.ratio || left.level.localeCompare(right.level));
}

export function buildCostRows(
  runs: PromptRunResult[],
  modelCosts: Map<string, CostCounter>,
  strategyCosts: Map<string, CostCounter>,
): CostRow[] {
  const rows = [
    ...[...modelCosts.entries()].map(([label, values]) => ({
      label,
      totalTokens: values.tokens,
      totalEstimatedCostUsd: values.costUsd,
      averageCostPerQuestionUsd: safeRatio(values.costUsd, runs.length),
    })),
    ...[...strategyCosts.entries()].map(([label, values]) => ({
      label: `strategy:${label}`,
      totalTokens: values.tokens,
      totalEstimatedCostUsd: values.costUsd,
      averageCostPerQuestionUsd: safeRatio(values.costUsd, runs.length),
    })),
  ];

  return rows.sort((left, right) => left.label.localeCompare(right.label));
}
