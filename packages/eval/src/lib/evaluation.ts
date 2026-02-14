import type {
  EvaluationResult,
  PromptEvaluation,
  ProviderResponse,
} from '../types.js';

interface EvalLike {
  name: PromptEvaluation['evaluator'];
  evaluate(response: string, groundTruth: string): EvaluationResult;
}

export function evaluateResponses(
  evaluator: EvalLike | null,
  responses: ProviderResponse[],
  groundTruth: string,
): PromptEvaluation | undefined {
  if (!evaluator || groundTruth.length === 0) {
    return undefined;
  }

  const results: Record<string, EvaluationResult> = {};
  let evaluatedResponses = 0;
  let correctResponses = 0;

  for (const response of responses) {
    if (response.error) {
      continue;
    }

    const key = `${response.provider}:${response.model}`;
    const result = evaluator.evaluate(response.content, groundTruth);
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
