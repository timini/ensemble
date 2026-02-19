import type { TierConfig, TierName } from './regressionTypes.js';

/**
 * Tier configurations are being rebuilt from the ground up.
 *
 * The previous hardcoded configs (CI, post-merge, homogeneous variants)
 * used wrong assumptions: 3-member ensembles, temperature=0, and
 * model selections that haven't been validated against baselines.
 *
 * TODO: Rebuild tier configs once quick-eval baselines are established
 * with 5-member ensembles, temperature=0.7, and validated model sets.
 */

/**
 * Returns the tier configuration for the given evaluation tier.
 *
 * @param tier - The evaluation tier name.
 * @returns The corresponding {@link TierConfig}.
 * @throws {Error} Always — tier configs are not yet configured.
 */
export function getTierConfig(tier: TierName): TierConfig {
  throw new Error(
    `Tier "${tier}" is not yet configured. ` +
    'Tier configs are being rebuilt — use quick-eval for now.',
  );
}
