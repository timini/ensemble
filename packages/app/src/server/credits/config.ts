import { centsToMicros, MICROS_PER_USD, usdToMicrosCeil } from "./money";

/** A credit pack sold through Stripe Checkout. Credits equal the price paid. */
export interface CreditPack {
  /** Stable id sent by the client and stored in the Checkout metadata, `usd-5`. */
  id: string;
  amountCents: number;
  creditMicros: number;
}

export interface CreditConfig {
  /** Charged on top of model cost, in percent. 30 means a $1.00 run costs $1.30 in credits. */
  marginPercent: number;
  /** Below this balance the UI warns (FR-038). */
  lowBalanceMicros: number;
  packs: CreditPack[];
}

/** The environment variables read here, all optional. */
export interface CreditEnv {
  CREDIT_MARGIN_PERCENT?: string;
  CREDIT_LOW_BALANCE_USD?: string;
  /** Comma-separated dollar amounts, `5,20,50`. */
  CREDIT_PACKS_USD?: string;
}

const MIN_PACK_CENTS = 100;

function pack(usd: number): CreditPack {
  const amountCents = Math.round(usd * 100);
  return {
    id: `usd-${usd}`,
    amountCents,
    creditMicros: centsToMicros(amountCents),
  };
}

export const DEFAULT_CREDIT_CONFIG: CreditConfig = {
  marginPercent: 30,
  lowBalanceMicros: MICROS_PER_USD,
  packs: [pack(5), pack(20), pack(50)],
};

function nonNegative(
  name: string,
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a number of zero or more, got "${raw}"`);
  }
  return value;
}

function readPacks(raw: string | undefined): CreditPack[] {
  if (raw === undefined || raw.trim() === "")
    return DEFAULT_CREDIT_CONFIG.packs;
  const packs = raw.split(",").map((part) => {
    const usd = Number(part.trim());
    if (!Number.isFinite(usd) || Math.round(usd * 100) < MIN_PACK_CENTS) {
      throw new Error(
        `CREDIT_PACKS_USD must list dollar amounts of at least $1, got "${raw}"`,
      );
    }
    return pack(usd);
  });
  if (new Set(packs.map((p) => p.id)).size !== packs.length) {
    throw new Error(`CREDIT_PACKS_USD lists the same amount twice: "${raw}"`);
  }
  return packs;
}

/** Read the credit settings from the environment, with the documented defaults. */
export function readCreditConfig(env: CreditEnv): CreditConfig {
  const lowBalanceUsd = nonNegative(
    "CREDIT_LOW_BALANCE_USD",
    env.CREDIT_LOW_BALANCE_USD,
    DEFAULT_CREDIT_CONFIG.lowBalanceMicros / MICROS_PER_USD,
  );
  return {
    marginPercent: nonNegative(
      "CREDIT_MARGIN_PERCENT",
      env.CREDIT_MARGIN_PERCENT,
      DEFAULT_CREDIT_CONFIG.marginPercent,
    ),
    lowBalanceMicros: usdToMicrosCeil(lowBalanceUsd),
    packs: readPacks(env.CREDIT_PACKS_USD),
  };
}

/** Find a pack by the id the client sent. */
export function findPack(
  config: CreditConfig,
  packId: string,
): CreditPack | undefined {
  return config.packs.find((p) => p.id === packId);
}
