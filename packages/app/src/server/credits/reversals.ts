import type { Firestore } from "firebase-admin/firestore";
import { appendEntry, balanceOf, COLLECTIONS, userRef } from "./ledger";
import { centsToMicros } from "./money";

/**
 * What Stripe reported: the charge's refund total so far, a dispute that
 * opened, or a dispute that closed in the seller's favour (won, or an
 * inquiry closed without a chargeback).
 */
export type ReversalSource =
  | { kind: "refund"; refundedCents: number }
  | { kind: "dispute"; disputeId: string; amountCents: number }
  | { kind: "disputeWon"; disputeId: string };

export interface ReversalInput {
  /** Stripe event id, stored in stripeEvents so a redelivery is skipped. */
  eventId: string;
  eventType: string;
  /** The PaymentIntent of the refunded or disputed charge. */
  paymentIntentId: string;
  source: ReversalSource;
}

export type ReversalResult =
  | {
      result: "reversed";
      uid: string;
      reversedMicros: number;
      balanceMicros: number;
    }
  | {
      /** A won dispute gave credits back; `reversedMicros` is negative. */
      result: "restored";
      uid: string;
      reversedMicros: number;
      balanceMicros: number;
    }
  | {
      result: "duplicate";
      uid: string;
      reversedMicros: 0;
      balanceMicros: number;
    }
  | { result: "unmatched"; reversedMicros: 0 };

interface ReversalState {
  uid: string;
  /** Latest refund total of the charge, in micros. */
  refundedMicros: number;
  /** Disputed amount per open or lost dispute id, in micros. */
  disputes: Record<string, number>;
  /** Disputes closed in the seller's favour; they never count again. */
  wonDisputes: string[];
  /** Credits already taken back for this purchase. */
  reversedMicros: number;
}

function stateOf(data: unknown, uid: string): ReversalState {
  const d = (data ?? {}) as Partial<ReversalState>;
  return {
    uid,
    refundedMicros: d.refundedMicros ?? 0,
    disputes: d.disputes ?? {},
    wonDisputes: d.wonDisputes ?? [],
    reversedMicros: d.reversedMicros ?? 0,
  };
}

/**
 * Take back the credits of a purchase that Stripe refunded or that the
 * buyer disputed. Refunds report the charge's total refunded so far and
 * each dispute its own amount, so the purchase keeps a running record
 * (`stripeReversals/{sessionId}`) and only the difference is reversed:
 * the same refund reported twice, or a refund and a dispute of the same
 * money, never take more than the purchase added. A dispute closed in the
 * seller's favour stops counting, and what it took back is restored, once
 * (a late or repeated opening event of that dispute is ignored). The
 * balance may go negative when the credits were already spent; Pro runs
 * are then refused until it is positive again. Idempotent by event id.
 */
export async function recordReversal(
  db: Firestore,
  input: ReversalInput,
): Promise<ReversalResult> {
  const purchases = db
    .collection(COLLECTIONS.ledger)
    .where("stripePaymentIntentId", "==", input.paymentIntentId)
    .where("type", "==", "purchase")
    .limit(1);
  const eventRef = db.collection(COLLECTIONS.stripeEvents).doc(input.eventId);
  return db.runTransaction(async (tx) => {
    const [found, event] = await Promise.all([
      tx.get(purchases),
      tx.get(eventRef),
    ]);
    const purchase = found.docs[0];
    if (!purchase) return { result: "unmatched", reversedMicros: 0 };
    const uid = String(purchase.get("uid"));
    const sessionId = String(purchase.get("stripeSessionId"));
    const purchasedMicros = Number(purchase.get("amountMicros"));
    const stateRef = db.collection(COLLECTIONS.stripeReversals).doc(sessionId);
    const [user, stateDoc] = await Promise.all([
      tx.get(userRef(db, uid)),
      tx.get(stateRef),
    ]);
    if (event.exists) {
      return {
        result: "duplicate",
        uid,
        reversedMicros: 0,
        balanceMicros: balanceOf(user),
      };
    }

    const state = stateOf(stateDoc.data(), uid);
    if (input.source.kind === "refund") {
      state.refundedMicros = Math.max(
        state.refundedMicros,
        centsToMicros(input.source.refundedCents),
      );
    } else if (input.source.kind === "disputeWon") {
      delete state.disputes[input.source.disputeId];
      if (!state.wonDisputes.includes(input.source.disputeId))
        state.wonDisputes.push(input.source.disputeId);
    } else if (!state.wonDisputes.includes(input.source.disputeId)) {
      state.disputes[input.source.disputeId] = centsToMicros(
        input.source.amountCents,
      );
    }
    const disputed = Object.values(state.disputes).reduce((a, b) => a + b, 0);
    const owed = Math.min(purchasedMicros, state.refundedMicros + disputed);
    // Only a won dispute lowers what is owed, so only it restores credits.
    const reversedMicros =
      input.source.kind === "disputeWon"
        ? Math.min(0, owed - state.reversedMicros)
        : Math.max(0, owed - state.reversedMicros);
    state.reversedMicros += reversedMicros;

    tx.set(stateRef, state);
    tx.create(eventRef, {
      type: input.eventType,
      sessionId,
      handledAt: new Date(),
    });
    if (reversedMicros === 0) {
      return {
        result: "duplicate",
        uid,
        reversedMicros: 0,
        balanceMicros: balanceOf(user),
      };
    }
    const balanceMicros = appendEntry(
      tx,
      db,
      user,
      db.collection(COLLECTIONS.ledger).doc(`reversal__${input.eventId}`),
      {
        uid,
        type: "reversal",
        amountMicros: -reversedMicros,
        reason:
          input.source.kind === "disputeWon"
            ? "dispute_won"
            : input.source.kind,
        stripeSessionId: sessionId,
        stripePaymentIntentId: input.paymentIntentId,
        stripeEventId: input.eventId,
        ...(input.source.kind !== "refund"
          ? { stripeDisputeId: input.source.disputeId }
          : {}),
      },
    );
    return {
      result: reversedMicros > 0 ? "reversed" : "restored",
      uid,
      reversedMicros,
      balanceMicros,
    };
  });
}
