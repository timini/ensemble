import type { PromptRunResult } from '../types.js';
import { pickPrimaryStrategy } from './analysisHelpers.js';
import {
  collectAnalysisAggregates,
  type QuestionSummary,
} from './analysisAggregates.js';
import { buildComparisonStats } from './analysisComparisons.js';
import { buildModelDiversityHeatmap, buildRightAnswerAlwaysThereStats } from './analysisCharts.js';
import { buildAgreementRows, buildBreakdownRows, buildCostRows, toAccuracyRows } from './analysisRows.js';
import type { AnalysisSummary, NotableExample } from './analysisTypes.js';

interface AnalyzeOptions {
  bootstrapIterations?: number;
}

function buildNotableExamples(
  questions: QuestionSummary[],
  primaryStrategy: string | null,
): NotableExample[] {
  if (!primaryStrategy) {
    return [];
  }

  return questions
    .filter((question) => {
      const strategy = question.strategyResults[primaryStrategy];
      const modelCorrect = Object.values(question.modelResults).some((entry) => entry.correct);
      return strategy?.correct === true && !modelCorrect;
    })
    .slice(0, 5)
    .map((question) => ({
      questionId: question.questionId,
      prompt: question.prompt,
      groundTruth: question.groundTruth,
      strategy: primaryStrategy,
      ensembleAnswer: question.strategyResults[primaryStrategy].predicted,
      modelAccuracies: Object.fromEntries(
        Object.entries(question.modelResults).map(([model, value]) => [model, value.correct]),
      ),
    }));
}

export function analyzeBenchmarkRuns(
  runs: PromptRunResult[],
  options?: AnalyzeOptions,
): AnalysisSummary {
  const bootstrapIterations = options?.bootstrapIterations ?? 10_000;
  const primaryStrategy = pickPrimaryStrategy(runs);
  const aggregates = collectAnalysisAggregates(runs);

  const modelAccuracy = toAccuracyRows(aggregates.modelCounts);
  const strategyAccuracy = toAccuracyRows(aggregates.strategyCounts);
  const categoryBreakdown = buildBreakdownRows('category', aggregates.questions, primaryStrategy);
  const difficultyBreakdown = buildBreakdownRows('difficulty', aggregates.questions, primaryStrategy);
  const agreementCalibration = buildAgreementRows(aggregates.agreementBins);
  const comparisons = buildComparisonStats(
    aggregates.questions,
    primaryStrategy,
    modelAccuracy.map((row) => row.label),
    bootstrapIterations,
  );

  return {
    promptCount: runs.length,
    modelAccuracy,
    strategyAccuracy,
    comparisons,
    agreementCalibration,
    categoryBreakdown,
    difficultyBreakdown,
    notableExamples: buildNotableExamples(aggregates.questions, primaryStrategy),
    costAnalysis: buildCostRows(runs, aggregates.modelCosts, aggregates.strategyCosts),
    charts: {
      accuracyLiftByDifficulty: difficultyBreakdown.map((row) => ({
        difficulty: row.key,
        lift: row.lift,
        sampleSize: row.sampleSize,
      })),
      agreementCalibration,
      modelDiversityHeatmap: buildModelDiversityHeatmap(
        aggregates.questions,
        modelAccuracy.map((row) => row.label),
      ),
      costVsAccuracyFrontier: [
        ...modelAccuracy.map((row) => ({
          label: row.label,
          type: 'model' as const,
          accuracy: row.accuracy,
          totalEstimatedCostUsd: aggregates.modelCosts.get(row.label)?.costUsd ?? 0,
        })),
        ...strategyAccuracy.map((row) => ({
          label: row.label,
          type: 'strategy' as const,
          accuracy: row.accuracy,
          totalEstimatedCostUsd: aggregates.strategyCosts.get(row.label)?.costUsd ?? 0,
        })),
      ],
      rightAnswerAlwaysThere: buildRightAnswerAlwaysThereStats(
        aggregates.questions,
        primaryStrategy,
      ),
    },
    primaryStrategy,
  };
}
