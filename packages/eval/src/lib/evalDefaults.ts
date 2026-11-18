/**
 * Default models for quick-eval, generate-cache and the eval:ci scripts.
 *
 * CACHED_EVAL_MODEL must match the model of the committed caches in
 * .cache/ensemble/ and .cache/baselines/. If it does not, every CI run
 * misses the cache and pays for live ensemble and baseline calls.
 *
 * The judge matches the one used to score the committed single-model
 * baseline cache, so single and ensemble answers are graded the same way.
 * Consensus calls are the only live calls on a cached run, so they use the
 * cheapest Gemini model.
 */
export const CACHED_EVAL_MODEL = 'google:gemini-3-flash-preview';
export const DEFAULT_CONSENSUS_MODEL = 'google:gemini-2.5-flash-lite';
export const DEFAULT_JUDGE_MODEL = 'google:gemini-2.5-flash';

/** Questions per dataset for real (free mode) runs: enough for useful intervals and paired tests. */
export const DEFAULT_SAMPLE_FREE = 200;
/** Questions per dataset in mock mode, which measures nothing. */
export const DEFAULT_SAMPLE_MOCK = 20;
/** Seed for picking questions, shared by quick-eval and generate-cache so they pick the same ones. */
export const QUESTION_SEED = 42;

/** Parse --sample, or pick the default for the mode. */
export function resolveSampleSize(raw: string | undefined, mode: 'mock' | 'free'): number {
  if (raw === undefined) return mode === 'free' ? DEFAULT_SAMPLE_FREE : DEFAULT_SAMPLE_MOCK;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid sample count "${raw}".`);
  }
  return value;
}

/** A warning for real runs smaller than DEFAULT_SAMPLE_FREE, or null. */
export function sampleSizeWarning(sample: number, mode: 'mock' | 'free'): string | null {
  if (mode !== 'free' || sample >= DEFAULT_SAMPLE_FREE) return null;
  return (
    `n=${sample} per dataset is below ${DEFAULT_SAMPLE_FREE}; confidence intervals will be wide ` +
    'and paired tests will rarely find a difference.'
  );
}
