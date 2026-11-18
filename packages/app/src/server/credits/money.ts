/**
 * Credit amounts are integers in micro-dollars: 1 USD is 1,000,000 micros.
 * A single cheap model call costs a fraction of a cent, so cents would round
 * most calls up to a whole cent; integer micros keep exact sums in Firestore
 * and stay far inside Number.MAX_SAFE_INTEGER (about $9 billion).
 */
export const MICROS_PER_USD = 1_000_000;

/** Stripe amounts are in cents. */
export function centsToMicros(cents: number): number {
  return Math.round(cents) * (MICROS_PER_USD / 100);
}

/**
 * Convert USD to whole micro-dollars, rounding up so a charge is never short.
 * A tiny epsilon absorbs float noise (0.1 + 0.2 is 300000 micros, not 300001).
 */
export function usdToMicrosCeil(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new RangeError(`Expected a non-negative USD amount, got ${usd}`);
  }
  return Math.max(0, Math.ceil(usd * MICROS_PER_USD - 1e-6));
}

/** "$1.234567", for logs and error messages. The UI formats with Intl. */
export function formatMicrosUsd(micros: number): string {
  return `$${(micros / MICROS_PER_USD).toFixed(6)}`;
}
