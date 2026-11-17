import type { TFunction } from 'i18next';
import type { RunEstimate } from '@ensemble-ai/shared-utils/pricing';
import { coverageOf, formatUsd } from '../RunCostSummary/runCostFormat';

/**
 * Short cost label for one method in the method menu: a range, "about" one
 * amount, "free" for local runs, a lower bound when some calls have no price,
 * or unknown when none has. Calls with no price are never shown as free.
 */
export function methodCostLabel(estimate: RunEstimate, t: TFunction, locale: string): string {
  const { lowUsd, highUsd, pricedCallCount, unpricedCallCount } = estimate.cost;
  const coverage = coverageOf(pricedCallCount, unpricedCallCount);
  const usd = (value: number) => formatUsd(value, locale);
  if (coverage === 'none') return t('molecules.methodMenu.costUnknown');
  if (coverage === 'partial') return t('molecules.methodMenu.costAtLeast', { cost: usd(lowUsd) });
  if (highUsd === 0) return t('molecules.methodMenu.costFree');
  const low = usd(lowUsd);
  const high = usd(highUsd);
  return low === high ? t('molecules.methodMenu.costAbout', { cost: high }) : t('molecules.methodMenu.costRange', { low, high });
}
