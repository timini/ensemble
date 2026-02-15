import type {
  EvaluationResult,
  PromptEvaluation,
  ProviderResponse,
} from '../types.js';

interface EvalLike {
  name: PromptEvaluation['evaluator'];
  evaluate(
    response: string,
    groundTruth: string,
    prompt?: string,
  ): EvaluationResult | Promise<EvaluationResult>;
}

export async function evaluateResponses(
  evaluator: EvalLike | null,
  responses: ProviderResponse[],
  groundTruth: string,
  prompt?: string,
): Promise<PromptEvaluation | undefined> {
  if (!evaluator || groundTruth.length === 0) {
    return undefined;
  }

  const results: Record<string, EvaluationResult> = {};
  let evaluatedResponses = 0;
  let correctResponses = 0;

  for (const [index, response] of responses.entries()) {
    if (response.error) {
      continue;
    }

    const baseKey = `${response.provider}:${response.model}`;
    const key = results[baseKey] ? `${baseKey}#${index + 1}` : baseKey;
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
