import type {
  ConsensusEvaluation,
  EvaluationResult,
  PromptEvaluation,
  ProviderResponse,
  StrategyName,
} from '../types.js';

export interface EvaluatorLike {
  name: PromptEvaluation['evaluator'];
  evaluate(
    response: string,
    groundTruth: string,
    prompt?: string,
  ): EvaluationResult | Promise<EvaluationResult>;
}

export async function evaluateResponses(
  evaluator: EvaluatorLike | null,
  responses: ProviderResponse[],
  groundTruth: string,
  prompt?: string,
): Promise<PromptEvaluation | undefined> {
  if (!evaluator || groundTruth.length === 0) {
    return undefined;
  }

  const results: Record<string, EvaluationResult> = {};
  const keyOccurrences: Record<string, number> = {};
  let evaluatedResponses = 0;
  let correctResponses = 0;

  for (const response of responses) {
    if (response.error) {
      continue;
    }

    const baseKey = `${response.provider}:${response.model}`;
    const occurrence = (keyOccurrences[baseKey] ?? 0) + 1;
    keyOccurrences[baseKey] = occurrence;
    const key = occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`;
    const result = await evaluator.evaluate(response.content, groundTruth, prompt);
    results[key] = result;
    evaluatedResponses += 1;
    if (result.correct) {
      correctResponses += 1;
    }
  }

  return {
    evaluator: evaluator.name,
    groundTruth,
    accuracy: evaluatedResponses === 0 ? 0 : correctResponses / evaluatedResponses,
    results,
  };
}

export async function evaluateConsensusStrategies(
  evaluator: EvaluatorLike | null,
  consensus: Partial<Record<StrategyName, string>>,
  groundTruth: string,
  prompt?: string,
): Promise<ConsensusEvaluation | undefined> {
  if (!evaluator || groundTruth.length === 0) {
    return undefined;
  }

  const results: Partial<Record<StrategyName, EvaluationResult>> = {};
  for (const [strategy, answer] of Object.entries(consensus)) {
    if (!answer) {
      continue;
    }
    const result = await evaluator.evaluate(answer, groundTruth, prompt);
    results[strategy as StrategyName] = result;
  }

  return {
    evaluator: evaluator.name,
    groundTruth,
    results,
  };
}
