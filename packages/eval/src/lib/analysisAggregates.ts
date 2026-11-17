import type { EvaluationResult, PromptRunResult, StrategyName } from '../types.js';
import {
  collectModelResults,
  evaluateConsensusAnswer,
  responseCostTotals,
} from './analysisHelpers.js';

export interface AccuracyCounter {
  correct: number;
  total: number;
  errors: number;
  timeouts: number;
}

export interface CostCounter {
  tokens: number;
  costUsd: number;
  /** Calls with no price, which costUsd leaves out. */
  unpriced: number;
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
  result: Pick<EvaluationResult, 'correct' | 'failure'>,
): void {
  const row = map.get(key) ?? { correct: 0, total: 0, errors: 0, timeouts: 0 };
  row.total += 1;
  row.correct += result.correct ? 1 : 0;
  if (result.failure === 'error') row.errors += 1;
  if (result.failure === 'timeout') row.timeouts += 1;
  map.set(key, row);
}

function incrementCost(
  map: Map<string, CostCounter>,
  key: string,
  tokens: number,
  costUsd: number,
  unpriced: number,
): void {
  const row = map.get(key) ?? { tokens: 0, costUsd: 0, unpriced: 0 };
  row.tokens += tokens;
  row.costUsd += costUsd;
  row.unpriced += unpriced;
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
      incrementAccuracy(modelCounts, model, result);
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
        response.estimatedCostUsd === undefined ? 1 : 0,
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
        incrementAccuracy(strategyCounts, strategy, evaluated);
      }
    }
    // Strategies scored with no output (failed or not run) still count as wrong.
    for (const [strategy, result] of Object.entries(run.consensusEvaluation?.results ?? {})) {
      if (!result || strategy in run.consensus) continue;
      strategyResults[strategy] = { predicted: '', correct: result.correct };
      incrementAccuracy(strategyCounts, strategy, result);
    }
    // A strategy costs the ensemble's answers plus its own consensus calls.
    for (const strategy of Object.keys(strategyResults)) {
      const metrics = run.consensusMetrics?.[strategy as StrategyName];
      incrementCost(
        strategyCosts,
        strategy,
        runCost.tokens + (metrics?.tokenCount ?? 0),
        runCost.costUsd + (metrics?.costUsd ?? 0),
        runCost.unpriced + (metrics && metrics.costUsd === undefined ? 1 : 0),
      );
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
