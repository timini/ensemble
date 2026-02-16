import type { PromptRunResult, StrategyName } from '../types.js';
import {
  collectModelResults,
  evaluateConsensusAnswer,
  responseCostTotals,
} from './analysisHelpers.js';

export interface AccuracyCounter {
  correct: number;
  total: number;
}

export interface CostCounter {
  tokens: number;
  costUsd: number;
}

export interface AgreementCounter {
  ratio: number;
  correct: number;
  total: number;
}

export interface QuestionSummary {
  questionId: string;
  prompt: string;
  groundTruth: string;
  category: string;
  difficulty: string;
  modelResults: Record<string, { predicted: string | null; correct: boolean }>;
  strategyResults: Record<string, { predicted: string; correct: boolean | null }>;
}

export interface AnalysisAggregates {
  questions: QuestionSummary[];
  modelCounts: Map<string, AccuracyCounter>;
  strategyCounts: Map<string, AccuracyCounter>;
  modelCosts: Map<string, CostCounter>;
  strategyCosts: Map<string, CostCounter>;
  agreementBins: Map<string, AgreementCounter>;
}

function incrementAccuracy(
  map: Map<string, AccuracyCounter>,
  key: string,
  isCorrect: boolean,
): void {
  const row = map.get(key) ?? { correct: 0, total: 0 };
  row.total += 1;
  row.correct += isCorrect ? 1 : 0;
  map.set(key, row);
}

function incrementCost(
  map: Map<string, CostCounter>,
  key: string,
  tokens: number,
  costUsd: number,
): void {
  const row = map.get(key) ?? { tokens: 0, costUsd: 0 };
  row.tokens += tokens;
  row.costUsd += costUsd;
  map.set(key, row);
}

function updateAgreementBin(
  run: PromptRunResult,
  groundTruth: string,
  modelResults: Record<string, { predicted: string | null; correct: boolean }>,
  agreementBins: Map<string, AgreementCounter>,
): void {
  const predictions = Object.values(modelResults)
    .map((result) => result.predicted?.trim().toUpperCase())
    .filter((value): value is string => Boolean(value));
  if (predictions.length === 0) {
    return;
  }

  const counts = new Map<string, number>();
  for (const prediction of predictions) {
    counts.set(prediction, (counts.get(prediction) ?? 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  const level = `${maxCount}/${predictions.length}`;
  const ratio = maxCount / predictions.length;
  const majorityPrediction = [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0];
  const majorityEval = evaluateConsensusAnswer(
    run.evaluation?.evaluator,
    majorityPrediction,
    groundTruth,
  );
  if (!majorityEval) {
    return;
  }

  const bin = agreementBins.get(level) ?? { ratio, correct: 0, total: 0 };
  bin.total += 1;
  bin.correct += majorityEval.correct ? 1 : 0;
  agreementBins.set(level, bin);
}

export function collectAnalysisAggregates(runs: PromptRunResult[]): AnalysisAggregates {
  const modelCounts = new Map<string, AccuracyCounter>();
  const strategyCounts = new Map<string, AccuracyCounter>();
  const modelCosts = new Map<string, CostCounter>();
  const strategyCosts = new Map<string, CostCounter>();
  const agreementBins = new Map<string, AgreementCounter>();
  const questions: QuestionSummary[] = [];

  for (const run of runs) {
    const groundTruth = run.evaluation?.groundTruth ?? run.groundTruth ?? '';
    const modelResults = collectModelResults(run);
    for (const [model, result] of Object.entries(modelResults)) {
      incrementAccuracy(modelCounts, model, result.correct);
    }

    for (const response of run.responses) {
      if (response.error) {
        continue;
      }
      incrementCost(
        modelCosts,
        `${response.provider}:${response.model}`,
        response.tokenCount ?? 0,
        response.estimatedCostUsd ?? 0,
      );
    }

    const strategyResults: QuestionSummary['strategyResults'] = {};
    const runCost = responseCostTotals(run);
    for (const [strategy, answer] of Object.entries(run.consensus)) {
      const preComputed = run.consensusEvaluation?.results?.[strategy as StrategyName];
      const evaluated = preComputed ?? evaluateConsensusAnswer(
        run.evaluation?.evaluator,
        answer,
        groundTruth,
      );
      strategyResults[strategy] = { predicted: answer, correct: evaluated?.correct ?? null };
      if (evaluated) {
        incrementAccuracy(strategyCounts, strategy, evaluated.correct);
      }
      incrementCost(strategyCosts, strategy, runCost.tokens, runCost.costUsd);
    }

    updateAgreementBin(run, groundTruth, modelResults, agreementBins);
    questions.push({
      questionId: run.questionId ?? run.prompt,
      prompt: run.prompt,
      groundTruth,
      category: run.category ?? 'uncategorized',
      difficulty: run.difficulty ?? 'unknown',
      modelResults: Object.fromEntries(
        Object.entries(modelResults).map(([model, result]) => [
          model,
          { predicted: result.predicted, correct: result.correct },
        ]),
      ),
      strategyResults,
    });
  }

  return {
    questions,
    modelCounts,
    strategyCounts,
    modelCosts,
    strategyCosts,
    agreementBins,
  };
}
