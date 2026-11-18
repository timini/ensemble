import type { Firestore } from "firebase-admin/firestore";
import {
  appendEntry,
  assertAmount,
  assertSafeId,
  COLLECTIONS,
  userRef,
} from "./ledger";

export interface GrantInput {
  uid: string;
  /** Idempotency key: the same grant id never credits twice for a user. */
  grantId: string;
  amountMicros: number;
  /** Why the credits were given, for the audit trail. */
  reason: string;
}

/** Add free credits (support, promotions, tests). Idempotent by grant id. */
export async function grantCredits(
  db: Firestore,
  input: GrantInput,
): Promise<{ duplicate: boolean; balanceMicros: number }> {
  assertSafeId("uid", input.uid);
  assertSafeId("grant id", input.grantId);
  assertAmount(input.amountMicros);
  const ref = db
    .collection(COLLECTIONS.ledger)
    .doc(`${input.uid}__grant__${input.grantId}`);
  return db.runTransaction(async (tx) => {
    const [user, existing] = await Promise.all([
      tx.get(userRef(db, input.uid)),
      tx.get(ref),
    ]);
    if (existing.exists)
      return {
        duplicate: true,
        balanceMicros: Number(user.get("balanceMicros") ?? 0),
      };
    const balanceMicros = appendEntry(tx, db, user, ref, {
      uid: input.uid,
      type: "grant",
      amountMicros: input.amountMicros,
      reason: input.reason.slice(0, 500),
    });
    return { duplicate: false, balanceMicros };
  });
}

export interface PurchaseInput {
  uid: string;
  /** Stripe Checkout Session id, the idempotency key of a purchase (Decision 4). */
  sessionId: string;
  /** Stripe event id, recorded in stripeEvents so a redelivery is skipped early. */
  eventId: string;
  /** Stripe event type, kept in the stripeEvents record. Defaults to checkout.session.completed. */
  eventType?: string;
  /** The session's PaymentIntent, which refunds and disputes refer to. */
  paymentIntentId?: string;
  packId: string;
  amountMicros: number;
  amountTotalCents: number;
  currency: string;
}

/**
 * Credit a paid Checkout Session, once. In one transaction it records the
 * Stripe event as handled and writes the purchase entry, keyed on the
 * session id, so neither a redelivered event nor a second event for the
 * same session credits twice.
 */
export async function recordPurchase(
  db: Firestore,
  input: PurchaseInput,
): Promise<{ duplicate: boolean; balanceMicros: number }> {
  assertSafeId("uid", input.uid);
  assertAmount(input.amountMicros);
  const entryRef = db
    .collection(COLLECTIONS.ledger)
    .doc(`purchase__${input.sessionId}`);
  const eventRef = db.collection(COLLECTIONS.stripeEvents).doc(input.eventId);
  return db.runTransaction(async (tx) => {
    const [user, entry, event] = await Promise.all([
      tx.get(userRef(db, input.uid)),
      tx.get(entryRef),
      tx.get(eventRef),
    ]);
    const balance = Number(user.get("balanceMicros") ?? 0);
    if (entry.exists || event.exists) {
      if (!event.exists)
        tx.create(eventRef, {
          type: input.eventType ?? "checkout.session.completed",
          sessionId: input.sessionId,
          duplicate: true,
          handledAt: new Date(),
        });
      return { duplicate: true, balanceMicros: balance };
    }
    const balanceMicros = appendEntry(tx, db, user, entryRef, {
      uid: input.uid,
      type: "purchase",
      amountMicros: input.amountMicros,
      stripeSessionId: input.sessionId,
      stripeEventId: input.eventId,
      ...(input.paymentIntentId
        ? { stripePaymentIntentId: input.paymentIntentId }
        : {}),
      packId: input.packId,
      amountTotalCents: input.amountTotalCents,
      currency: input.currency,
    });
    tx.create(eventRef, {
      type: input.eventType ?? "checkout.session.completed",
      sessionId: input.sessionId,
      handledAt: new Date(),
    });
    return { duplicate: false, balanceMicros };
  });
}
