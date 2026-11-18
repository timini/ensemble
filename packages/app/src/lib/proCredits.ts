import type { AccountStatus } from "@/components/molecules/AccountMenu";

/** credits.quote as the client receives it. */
export type ProQuote =
  | {
      status: "priced";
      requiredMicros: number;
      balanceMicros: number;
      canAfford: boolean;
      lowBalance: boolean;
    }
  | { status: "unpriced"; models: string[]; balanceMicros: number };

/** Why Ask is disabled in Pro, as an i18n key under pages.workspace.pro.block. */
export type ProBlock =
  | "signIn"
  | "unavailable"
  | "loading"
  | "insufficient"
  | "unpriced"
  | "error";

export type ProNotice =
  | { variant: "low"; balanceMicros: number }
  | { variant: "insufficient"; balanceMicros: number; requiredMicros: number }
  | { variant: "unpriced"; balanceMicros: number; unpricedModels: string[] }
  | { variant: "error" };

export interface ProCreditInput {
  auth: AccountStatus;
  account?: { balanceMicros: number; lowBalance: boolean };
  accountError?: boolean;
  /** Quote of the run in the composer, once it has loaded. */
  quote?: ProQuote;
}

/**
 * What the composer shows in Pro: whether Ask is blocked and why (FR-036),
 * and the credit notice under it (FR-038 low balance, a run the balance
 * cannot cover, models Pro cannot price, or a balance that failed to load).
 * The server checks again when it reserves the run.
 */
export function proCreditState(input: ProCreditInput): {
  block: ProBlock | null;
  notice: ProNotice | null;
} {
  if (input.auth === "signedOut") return { block: "signIn", notice: null };
  if (input.auth === "unavailable")
    return { block: "unavailable", notice: null };
  if (input.auth === "loading") return { block: "loading", notice: null };
  if (input.accountError)
    return { block: "error", notice: { variant: "error" } };
  const account = input.account;
  if (!account) return { block: "loading", notice: null };
  const quote = input.quote;
  if (quote?.status === "unpriced") {
    return {
      block: "unpriced",
      notice: {
        variant: "unpriced",
        balanceMicros: quote.balanceMicros,
        unpricedModels: quote.models,
      },
    };
  }
  if (quote && !quote.canAfford) {
    return {
      block: "insufficient",
      notice: {
        variant: "insufficient",
        balanceMicros: quote.balanceMicros,
        requiredMicros: quote.requiredMicros,
      },
    };
  }
  if (account.lowBalance) {
    return {
      block: null,
      notice: { variant: "low", balanceMicros: account.balanceMicros },
    };
  }
  return { block: null, notice: null };
}
