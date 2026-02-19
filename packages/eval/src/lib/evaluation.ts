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

  // Phase 1: compute deduplication keys (synchronous, preserves order)
  const keyOccurrences: Record<string, number> = {};
  const entries: Array<{ key: string; response: ProviderResponse }> = [];
  for (const response of responses) {
    if (response.error) continue;
    const baseKey = `${response.provider}:${response.model}`;
    const occurrence = (keyOccurrences[baseKey] ?? 0) + 1;
    keyOccurrences[baseKey] = occurrence;
    const key = occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`;
    entries.push({ key, response });
  }

  // Phase 2: evaluate all responses in parallel
  const evalResults = await Promise.all(
    entries.map(({ response }) =>
      evaluator.evaluate(response.content, groundTruth, prompt),
    ),
  );

  // Phase 3: assemble results
  const results: Record<string, EvaluationResult> = {};
  let correctResponses = 0;
  for (let i = 0; i < entries.length; i++) {
    results[entries[i].key] = evalResults[i];
    if (evalResults[i].correct) correctResponses++;
  }

  return {
    evaluator: evaluator.name,
    groundTruth,
    accuracy: entries.length === 0 ? 0 : correctResponses / entries.length,
    results,
  };
}

/**
 * Known error message prefixes produced by consensus strategies when there
 * are too few model responses.  If a consensus output starts with one of
 * these prefixes it is not a real answer and must be skipped.
 */
const CONSENSUS_ERROR_PREFIXES = [
  'ELO strategy requires',
  'Majority strategy requires',
  'Standard strategy requires',
];

function isConsensusError(value: string): boolean {
  return CONSENSUS_ERROR_PREFIXES.some((prefix) => value.startsWith(prefix));
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

  // Collect valid entries
  const entries: Array<{ strategy: StrategyName; answer: string }> = [];
  for (const [strategy, answer] of Object.entries(consensus)) {
    if (answer && !isConsensusError(answer)) {
      entries.push({ strategy: strategy as StrategyName, answer });
    }
  }

  // Evaluate all strategies in parallel
  const evalResults = await Promise.all(
    entries.map(({ answer }) => evaluator.evaluate(answer, groundTruth, prompt)),
  );

  // Assemble results
  const results: Partial<Record<StrategyName, EvaluationResult>> = {};
  for (let i = 0; i < entries.length; i++) {
    results[entries[i].strategy] = evalResults[i];
  }

  return {
    evaluator: evaluator.name,
    groundTruth,
    results,
  };
}
