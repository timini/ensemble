import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { CallUsage, PriceTable } from "@ensemble-ai/shared-utils/pricing";
import type { CreditConfig } from "./config";
import { InsufficientCreditsError, LedgerStateError } from "./errors";
import {
  appendEntry,
  assertAmount,
  assertSafeId,
  balanceOf,
  COLLECTIONS,
  runEntryRef,
  userRef,
} from "./ledger";
import { chargeForUsage } from "./pricing";

/** Settings settleRun needs; `priceTable` overrides the bundled table in tests. */
export type BillingConfig = Pick<CreditConfig, "marginPercent"> & {
  priceTable?: PriceTable;
};

export interface CreditAccount {
  uid: string;
  balanceMicros: number;
  /** True under the warning threshold (FR-038). */
  lowBalance: boolean;
  lowBalanceThresholdMicros: number;
}

/** The cached balance of a user, zero before their first ledger entry. */
export async function getCreditAccount(
  db: Firestore,
  config: Pick<CreditConfig, "lowBalanceMicros">,
  uid: string,
): Promise<CreditAccount> {
  assertSafeId("uid", uid);
  const balanceMicros = balanceOf(await userRef(db, uid).get());
  return {
    uid,
    balanceMicros,
    lowBalance: balanceMicros < config.lowBalanceMicros,
    lowBalanceThresholdMicros: config.lowBalanceMicros,
  };
}

interface RunRef {
  uid: string;
  runId: string;
}

function checkRun({ uid, runId }: RunRef) {
  assertSafeId("uid", uid);
  assertSafeId("run id", runId);
}

/**
 * Hold credits for a run before any model call. Throws
 * InsufficientCreditsError when the balance is too low (FR-036). Calling it
 * again with the same run id returns the first reservation unchanged.
 */
export async function reserveCredits(
  db: Firestore,
  input: RunRef & { amountMicros: number },
): Promise<{
  duplicate: boolean;
  reservedMicros: number;
  balanceMicros: number;
}> {
  checkRun(input);
  assertAmount(input.amountMicros);
  const { uid, runId, amountMicros } = input;
  return db.runTransaction(async (tx) => {
    const reserveRef = runEntryRef(db, uid, runId, "reserve");
    const [user, existing] = await Promise.all([
      tx.get(userRef(db, uid)),
      tx.get(reserveRef),
    ]);
    if (existing.exists) {
      return {
        duplicate: true,
        reservedMicros: -Number(existing.get("amountMicros")),
        balanceMicros: balanceOf(user),
      };
    }
    const balance = balanceOf(user);
    if (balance < amountMicros)
      throw new InsufficientCreditsError(balance, amountMicros);
    const balanceMicros = appendEntry(tx, db, user, reserveRef, {
      uid,
      type: "reserve",
      runId,
      amountMicros: -amountMicros,
    });
    return { duplicate: false, reservedMicros: amountMicros, balanceMicros };
  });
}

export interface SettleResult {
  duplicate: boolean;
  /** Credits finally taken for the run: actual cost plus margin, capped at the reservation. */
  chargedMicros: number;
  /** Part of the reservation given back. */
  releasedMicros: number;
  costUsd: number;
  balanceMicros: number;
}

/**
 * Close a run with the token usage it reported. The charge is the actual
 * cost plus the margin, never more than was reserved: an estimate the user
 * accepted is the most a run can cost them. Writes the usage record.
 * Idempotent by run id.
 */
export async function settleRun(
  db: Firestore,
  config: BillingConfig,
  input: RunRef & { calls: CallUsage[] },
): Promise<SettleResult> {
  checkRun(input);
  const { uid, runId, calls } = input;
  const usage = chargeForUsage(calls, config.marginPercent, config.priceTable);
  return db.runTransaction(async (tx) => {
    const refs = (["reserve", "settle", "refund"] as const).map((s) =>
      runEntryRef(db, uid, runId, s),
    );
    const [user, reserve, settled, refunded] = await Promise.all([
      tx.get(userRef(db, uid)),
      ...refs.map((ref) => tx.get(ref)),
    ]);
    if (settled?.exists) {
      return {
        duplicate: true,
        chargedMicros: Number(settled.get("chargedMicros")),
        releasedMicros: Number(settled.get("amountMicros")),
        costUsd: Number(settled.get("costUsd")),
        balanceMicros: balanceOf(user),
      };
    }
    if (!reserve?.exists)
      throw new LedgerStateError(`Run ${runId} has no reservation to settle`);
    if (refunded?.exists)
      throw new LedgerStateError(
        `Run ${runId} was refunded and cannot be settled`,
      );
    const reservedMicros = -Number(reserve.get("amountMicros"));
    const chargedMicros = Math.min(usage.chargeMicros, reservedMicros);
    const releasedMicros = reservedMicros - chargedMicros;
    const balanceMicros = appendEntry(tx, db, user, refs[1]!, {
      uid,
      type: "settle",
      runId,
      amountMicros: releasedMicros,
      chargedMicros,
      costUsd: usage.costUsd,
    });
    tx.create(db.collection(COLLECTIONS.usage).doc(`${uid}__${runId}`), {
      uid,
      runId,
      calls: calls.map((c) => ({ ...c })),
      costUsd: usage.costUsd,
      chargedMicros,
      reservedMicros,
      marginPercent: config.marginPercent,
      unpricedModels: usage.unpricedModels,
      createdAt: FieldValue.serverTimestamp(),
    });
    return {
      duplicate: false,
      chargedMicros,
      releasedMicros,
      costUsd: usage.costUsd,
      balanceMicros,
    };
  });
}

/**
 * Give back the whole reservation of a run that failed before it could be
 * settled. Idempotent by run id; refuses a run that was already settled.
 */
export async function refundRun(
  db: Firestore,
  input: RunRef & { reason: string },
): Promise<{
  duplicate: boolean;
  refundedMicros: number;
  balanceMicros: number;
}> {
  checkRun(input);
  const { uid, runId, reason } = input;
  return db.runTransaction(async (tx) => {
    const refs = (["reserve", "settle", "refund"] as const).map((s) =>
      runEntryRef(db, uid, runId, s),
    );
    const [user, reserve, settled, refunded] = await Promise.all([
      tx.get(userRef(db, uid)),
      ...refs.map((ref) => tx.get(ref)),
    ]);
    if (refunded?.exists) {
      return {
        duplicate: true,
        refundedMicros: Number(refunded.get("amountMicros")),
        balanceMicros: balanceOf(user),
      };
    }
    if (!reserve?.exists)
      throw new LedgerStateError(`Run ${runId} has no reservation to refund`);
    if (settled?.exists)
      throw new LedgerStateError(
        `Run ${runId} was settled and cannot be refunded`,
      );
    const refundedMicros = -Number(reserve.get("amountMicros"));
    const balanceMicros = appendEntry(tx, db, user, refs[2]!, {
      uid,
      type: "refund",
      runId,
      amountMicros: refundedMicros,
      reason: reason.slice(0, 500),
    });
    return { duplicate: false, refundedMicros, balanceMicros };
  });
}
