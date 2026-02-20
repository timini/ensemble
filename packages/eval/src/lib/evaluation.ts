import type {
  ConsensusEvaluation,
  EvaluationResult,
  PromptEvaluation,
  ProviderResponse,
  StrategyName,
} from '../types.js';

/** Per-evaluate-call timeout in ms. Prevents a single hanging API call from blocking for 300s. */
const EVAL_CALL_TIMEOUT_MS = 60_000;

export interface EvaluatorLike {
  name: PromptEvaluation['evaluator'];
  evaluate(
    response: string,
    groundTruth: string,
    prompt?: string,
  ): EvaluationResult | Promise<EvaluationResult>;
}

/** Wrap an evaluate call with a timeout so a single hanging judge call doesn't block forever. */
async function evaluateWithTimeout(
  evaluator: EvaluatorLike,
  content: string,
  groundTruth: string,
  prompt: string | undefined,
  label: string,
): Promise<EvaluationResult> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Eval call timed out after ${EVAL_CALL_TIMEOUT_MS}ms for ${label}`)), EVAL_CALL_TIMEOUT_MS);
    timer.unref();
  });
  try {
    const result = await Promise.race([
      evaluator.evaluate(content, groundTruth, prompt),
      timeoutPromise,
    ]);
    clearTimeout(timer!);
    const elapsed = Date.now() - start;
    if (elapsed > 10_000) {
      process.stderr.write(`  [eval-slow] ${label} took ${(elapsed / 1000).toFixed(1)}s\n`);
    }
    return result;
  } catch (err) {
    clearTimeout(timer!);
    const elapsed = Date.now() - start;
    process.stderr.write(`  [eval-error] ${label} failed after ${(elapsed / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}\n`);
    return { correct: false, expected: groundTruth.trim(), predicted: null };
  }
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

  // Phase 2: evaluate all responses in parallel with per-call timeout
  const evalResults = await Promise.all(
    entries.map(({ key, response }) =>
      evaluateWithTimeout(evaluator, response.content, groundTruth, prompt, key),
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

  // Evaluate all strategies in parallel with per-call timeout
  const evalResults = await Promise.all(
    entries.map(({ strategy, answer }) =>
      evaluateWithTimeout(evaluator, answer, groundTruth, prompt, `consensus:${strategy}`),
    ),
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
