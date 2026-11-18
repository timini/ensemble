import type { Firestore } from "firebase-admin/firestore";
import {
  estimateRun,
  type EstimateRunInput,
  type PriceTable,
} from "@ensemble-ai/shared-utils/pricing";
import type { CreditConfig } from "./config";
import { getCreditAccount, reserveCredits } from "./creditService";
import { chargeForEstimate } from "./pricing";

/** What a Pro run will do, as estimateRun takes it. Pro has no local endpoints. */
export type RunQuoteInput = Omit<EstimateRunInput, "endpoints" | "table">;

type QuoteConfig = Pick<CreditConfig, "marginPercent" | "lowBalanceMicros"> & {
  priceTable?: PriceTable;
};

export type RunQuote =
  | {
      status: "priced";
      /** Credits the run reserves: the high estimate plus the margin. */
      requiredMicros: number;
      balanceMicros: number;
      /** False blocks submission (FR-036). */
      canAfford: boolean;
      /** True under the warning threshold (FR-038). */
      lowBalance: boolean;
    }
  | { status: "unpriced"; models: string[]; balanceMicros: number };

/** Price a run before it starts and compare it with a balance. */
export function quoteRun(
  input: RunQuoteInput,
  config: QuoteConfig,
  balanceMicros: number,
): RunQuote {
  const estimate = estimateRun({ ...input, table: config.priceTable });
  const charge = chargeForEstimate(estimate, config.marginPercent);
  if (charge.status === "unpriced") {
    return { status: "unpriced", models: charge.models, balanceMicros };
  }
  return {
    status: "priced",
    requiredMicros: charge.micros,
    balanceMicros,
    canAfford: balanceMicros >= charge.micros,
    lowBalance: balanceMicros < config.lowBalanceMicros,
  };
}

/** Quote a run against a user's current balance in Firestore. */
export async function quoteRunForUser(
  db: Firestore,
  config: QuoteConfig,
  uid: string,
  input: RunQuoteInput,
): Promise<RunQuote> {
  const account = await getCreditAccount(db, config, uid);
  return quoteRun(input, config, account.balanceMicros);
}

/**
 * Price a run and reserve its credits in one step, for the Pro run path.
 * Throws InsufficientCreditsError when the balance is too low, and a
 * RangeError when a model has no price.
 */
export async function reserveForRun(
  db: Firestore,
  config: QuoteConfig,
  input: { uid: string; runId: string; run: RunQuoteInput },
) {
  const quote = quoteRun(input.run, config, Number.MAX_SAFE_INTEGER);
  if (quote.status === "unpriced") {
    throw new RangeError(`No price for ${quote.models.join(", ")}`);
  }
  return reserveCredits(db, {
    uid: input.uid,
    runId: input.runId,
    amountMicros: quote.requiredMicros,
  });
}
