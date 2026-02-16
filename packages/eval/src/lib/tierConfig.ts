import type { TierConfig } from './regressionTypes.js';

/**
 * CI tier configuration for fast PR gate checks.
 *
 * Uses 30 questions across 3 datasets with cheap models to provide quick
 * regression feedback. Targets under 5 minutes and under $0.50 per run.
 *
 * - 3 runs per evaluation (median for stability)
 * - p < 0.10 significance threshold (Fisher's exact test)
 */
export const CI_TIER_CONFIG: TierConfig = {
  name: 'ci',
  datasets: [
    { name: 'gsm8k', sampleSize: 10 },
    { name: 'truthfulqa', sampleSize: 10 },
    { name: 'gpqa', sampleSize: 10 },
  ],
  models: [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
    { provider: 'google', model: 'gemini-1.5-flash' },
  ],
  strategies: ['standard', 'elo', 'majority'],
  runs: 3,
  requestDelayMs: 200,
  significanceThreshold: 0.1,
  summarizer: { provider: 'openai', model: 'gpt-4o-mini' },
};

/**
 * Post-merge tier configuration for thorough nightly evaluation runs.
 *
 * Uses 250 questions across 3 datasets with full-capability models for
 * comprehensive regression detection. Targets approximately $2-3 per run.
 *
 * - 1 run (deterministic with temperature=0)
 * - p < 0.05 significance threshold (McNemar's test + Holm-Bonferroni correction)
 */
export const POST_MERGE_TIER_CONFIG: TierConfig = {
  name: 'post-merge',
  datasets: [
    { name: 'gsm8k', sampleSize: 100 },
    { name: 'truthfulqa', sampleSize: 100 },
    { name: 'gpqa', sampleSize: 50 },
  ],
  models: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-3.5-sonnet' },
    { provider: 'google', model: 'gemini-1.5-pro' },
    { provider: 'xai', model: 'grok-2' },
  ],
  strategies: ['standard', 'elo', 'majority'],
  runs: 1,
  requestDelayMs: 500,
  significanceThreshold: 0.05,
  summarizer: { provider: 'openai', model: 'gpt-4o' },
};

/**
 * Returns the tier configuration for the given evaluation tier.
 *
 * @param tier - The evaluation tier: `'ci'` for PR gate checks, `'post-merge'` for nightly runs.
 * @returns The corresponding {@link TierConfig}.
 * @throws {Error} If the tier name is not recognized.
 */
export function getTierConfig(tier: 'ci' | 'post-merge'): TierConfig {
  switch (tier) {
    case 'ci':
      return CI_TIER_CONFIG;
    case 'post-merge':
      return POST_MERGE_TIER_CONFIG;
    default:
      throw new Error(`Unknown tier: "${tier as string}"`);
  }
}
