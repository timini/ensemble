import { formatMicrosUsd } from "./money";

/** The balance cannot cover the credits a run needs (FR-036). */
export class InsufficientCreditsError extends Error {
  readonly balanceMicros: number;
  readonly requiredMicros: number;

  constructor(balanceMicros: number, requiredMicros: number) {
    super(
      `Insufficient credits: ${formatMicrosUsd(balanceMicros)} available, ${formatMicrosUsd(requiredMicros)} needed`,
    );
    this.name = "InsufficientCreditsError";
    this.balanceMicros = balanceMicros;
    this.requiredMicros = requiredMicros;
  }
}

/**
 * A ledger step out of order: settling or refunding a run with no
 * reservation, settling a refunded run, refunding a settled one.
 */
export class LedgerStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerStateError";
  }
}
