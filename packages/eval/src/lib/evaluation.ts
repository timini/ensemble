import type {
  AnswerFailure,
  ConsensusEvaluation,
  EvaluationResult,
  PromptEvaluation,
  PromptRunResult,
  ProviderResponse,
  StrategyName,
} from '../types.js';

const TIMEOUT_PATTERN = /timed?\s?out|timeout|ETIMEDOUT|aborted/i;

/** Classify a failed call from its error message. */
export function failureOf(message: string): AnswerFailure {
  return TIMEOUT_PATTERN.test(message) ? 'timeout' : 'error';
}

function failedResult(groundTruth: string, failure: AnswerFailure): EvaluationResult {
  return { correct: false, expected: groundTruth.trim(), predicted: null, failure };
}

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

/**
 * Result keys for each response, in order: `provider:model`, then
 * `provider:model#2` and so on for repeats of the same model.
 */
export function keyedResponses(responses: ProviderResponse[]): Array<{ key: string; response: ProviderResponse }> {
  const keyOccurrences: Record<string, number> = {};
  return responses.map((response) => {
    const baseKey = `${response.provider}:${response.model}`;
    const occurrence = (keyOccurrences[baseKey] ?? 0) + 1;
    keyOccurrences[baseKey] = occurrence;
    return { key: occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`, response };
  });
}

/**
 * Score failed responses that a stored run left unscored. Older caches
 * skipped responses that errored or timed out, so they had no result and
 * dropped out of accuracy. Each such response is added as wrong, with its
 * failure, and accuracy is recomputed. Runs with no ground truth, or with no
 * evaluation and no `evaluatorName` to record, are returned unchanged.
 */
export function scoreUnscoredResponses(
  run: PromptRunResult,
  evaluatorName?: PromptEvaluation['evaluator'],
): PromptRunResult {
  const groundTruth = run.evaluation?.groundTruth ?? run.groundTruth ?? '';
  const name = run.evaluation?.evaluator ?? evaluatorName;
  if (!groundTruth.trim() || !name) return run;
  const entries = keyedResponses(run.responses);
  const existing = run.evaluation?.results ?? {};
  if (entries.every(({ key }) => existing[key])) return run;

  const results: Record<string, EvaluationResult> = { ...existing };
  for (const { key, response } of entries) {
    if (results[key]) continue;
    results[key] = failedResult(groundTruth, failureOf(response.error ?? 'no answer was scored'));
  }
  const values = Object.values(results);
  return {
    ...run,
    evaluation: {
      evaluator: name,
      groundTruth,
      accuracy: values.length === 0 ? 0 : values.filter((r) => r.correct).length / values.length,
      results,
    },
  };
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

  const fnStart = Date.now();

  // Phase 1: compute deduplication keys (synchronous, preserves order)
  const entries = keyedResponses(responses);

  process.stderr.write(`  [evaluateResponses] start: ${entries.length} entries, evaluator=${evaluator.name}\n`);

  // Phase 2: evaluate all responses in parallel with per-call timeout
  // Failed calls are scored wrong without calling the evaluator.
  const evalResults = await Promise.all(
    entries.map(({ key, response }) =>
      response.error
        ? Promise.resolve(failedResult(groundTruth, failureOf(response.error)))
        : evaluateWithTimeout(evaluator, response.content, groundTruth, prompt, key),
    ),
  );

  process.stderr.write(`  [evaluateResponses] done in ${((Date.now() - fnStart) / 1000).toFixed(1)}s\n`);

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
  /** Strategies the run asked for. Any without a usable answer is scored wrong as an error. */
  expectedStrategies: StrategyName[] = [],
): Promise<ConsensusEvaluation | undefined> {
  if (!evaluator || groundTruth.length === 0) {
    return undefined;
  }

  const fnStart = Date.now();

  // Collect valid entries
  const entries: Array<{ strategy: StrategyName; answer: string }> = [];
  for (const [strategy, answer] of Object.entries(consensus)) {
    if (answer && !isConsensusError(answer)) {
      entries.push({ strategy: strategy as StrategyName, answer });
    }
  }

  process.stderr.write(`  [evaluateConsensus] start: ${entries.length} strategies=[${entries.map(e => e.strategy).join(',')}], evaluator=${evaluator.name}\n`);

  // Evaluate all strategies in parallel with per-call timeout
  const evalResults = await Promise.all(
    entries.map(({ strategy, answer }) =>
      evaluateWithTimeout(evaluator, answer, groundTruth, prompt, `consensus:${strategy}`),
    ),
  );

  process.stderr.write(`  [evaluateConsensus] done in ${((Date.now() - fnStart) / 1000).toFixed(1)}s\n`);

  // Assemble results
  const results: Partial<Record<StrategyName, EvaluationResult>> = {};
  for (let i = 0; i < entries.length; i++) {
    results[entries[i].strategy] = evalResults[i];
  }
  for (const strategy of expectedStrategies) {
    if (!results[strategy]) results[strategy] = failedResult(groundTruth, 'error');
  }

  return {
    evaluator: evaluator.name,
    groundTruth,
    results,
  };
}
