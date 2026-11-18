import {
  computeRunCost,
  PRICE_TABLE,
  type CallUsage,
  type PriceTable,
  type RunEstimate,
} from "@ensemble-ai/shared-utils/pricing";
import { usdToMicrosCeil } from "./money";

/** Model cost in USD plus the margin, as whole micro-dollars rounded up. */
export function applyMargin(usd: number, marginPercent: number): number {
  return usdToMicrosCeil(usd * (1 + marginPercent / 100));
}

export type EstimateCharge =
  | { status: "priced"; micros: number }
  | { status: "unpriced"; models: string[] };

/**
 * Credits to reserve before a run: the high end of estimateRun's cost range
 * plus the margin. A run with any unpriced model cannot be billed, so it is
 * refused rather than guessed.
 */
export function chargeForEstimate(
  estimate: RunEstimate,
  marginPercent: number,
): EstimateCharge {
  if (estimate.cost.unpricedCallCount > 0) {
    return { status: "unpriced", models: estimate.cost.unpricedModels };
  }
  return {
    status: "priced",
    micros: applyMargin(estimate.cost.highUsd, marginPercent),
  };
}

export interface UsageCharge {
  /** Model cost of the priced calls, before the margin. */
  costUsd: number;
  chargeMicros: number;
  unpricedModels: string[];
}

/** Credits for the calls a run actually made, from their token usage. */
export function chargeForUsage(
  calls: CallUsage[],
  marginPercent: number,
  table: PriceTable = PRICE_TABLE,
): UsageCharge {
  const cost = computeRunCost(calls, table);
  return {
    costUsd: cost.totalUsd,
    chargeMicros: applyMargin(cost.totalUsd, marginPercent),
    unpricedModels: cost.unpricedModels,
  };
}
