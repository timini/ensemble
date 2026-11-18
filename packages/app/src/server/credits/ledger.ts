import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";

/**
 * Firestore layout of the credit system. Only the server writes, through
 * firebase-admin; firestore.rules lets a user read their own documents.
 *
 * - `users/{uid}`: `{ uid, balanceMicros, createdAt, updatedAt }`. The
 *   balance is a cache of the ledger sum, updated in the same transaction
 *   as every entry.
 * - `creditLedger/{entryId}`: append-only entries, never updated or
 *   deleted. `amountMicros` is signed; the balance is their sum.
 * - `usage/{uid}__{runId}`: the calls, tokens and charge of a settled run.
 * - `stripeEvents/{eventId}`: Stripe events already handled.
 * - `stripeReversals/{sessionId}`: how much of a purchase refunds and
 *   disputes have taken back so far.
 */
export const COLLECTIONS = {
  users: "users",
  ledger: "creditLedger",
  usage: "usage",
  stripeEvents: "stripeEvents",
  stripeReversals: "stripeReversals",
} as const;

export type LedgerEntryType =
  | "purchase"
  | "reserve"
  | "settle"
  | "refund"
  | "grant"
  /** Credits of a purchase taken back after a Stripe refund or dispute, or given back when a dispute is won (reason `dispute_won`). */
  | "reversal";

/** One ledger document. Optional fields depend on the type. */
export interface LedgerEntry {
  uid: string;
  type: LedgerEntryType;
  /** Signed change to the balance: reserve is negative, a reversal negative (or positive when a won dispute restores credits), the others zero or positive. */
  amountMicros: number;
  balanceAfterMicros: number;
  createdAt: FieldValue;
  runId?: string;
  reason?: string;
  /** settle: model cost before margin, and the credits finally charged. */
  costUsd?: number;
  chargedMicros?: number;
  stripeSessionId?: string;
  stripeEventId?: string;
  stripePaymentIntentId?: string;
  stripeDisputeId?: string;
  packId?: string;
  amountTotalCents?: number;
  currency?: string;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Run ids become part of document ids, so they are limited to a safe alphabet. */
export function assertSafeId(
  kind: "uid" | "run id" | "grant id",
  value: string,
): void {
  if (!SAFE_ID.test(value) || value.includes("__")) {
    throw new RangeError(
      `Invalid ${kind}: use 1 to 128 letters, digits, - or _ (no "__")`,
    );
  }
}

export function assertAmount(micros: number): void {
  if (!Number.isSafeInteger(micros) || micros < 0) {
    throw new RangeError(
      `Invalid amount: expected whole micro-dollars of zero or more, got ${micros}`,
    );
  }
}

export type RunStep = "reserve" | "settle" | "refund";

/** Ledger document id of one step of a run: `{uid}__{runId}__{step}`. */
export function runEntryRef(
  db: Firestore,
  uid: string,
  runId: string,
  step: RunStep,
): DocumentReference {
  return db.collection(COLLECTIONS.ledger).doc(`${uid}__${runId}__${step}`);
}

export function userRef(db: Firestore, uid: string): DocumentReference {
  return db.collection(COLLECTIONS.users).doc(uid);
}

export function balanceOf(user: DocumentSnapshot): number {
  const value: unknown = user.get("balanceMicros");
  return typeof value === "number" ? value : 0;
}

/**
 * Write one ledger entry and the new cached balance. Call after every read
 * of the transaction. Returns the balance after the entry.
 */
export function appendEntry(
  tx: Transaction,
  db: Firestore,
  user: DocumentSnapshot,
  entryRef: DocumentReference,
  entry: Omit<LedgerEntry, "balanceAfterMicros" | "createdAt">,
): number {
  const balanceAfterMicros = balanceOf(user) + entry.amountMicros;
  const now = FieldValue.serverTimestamp();
  tx.create(entryRef, { ...entry, balanceAfterMicros, createdAt: now });
  tx.set(
    userRef(db, entry.uid),
    {
      uid: entry.uid,
      balanceMicros: balanceAfterMicros,
      updatedAt: now,
      ...(user.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );
  return balanceAfterMicros;
}
