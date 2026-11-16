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
