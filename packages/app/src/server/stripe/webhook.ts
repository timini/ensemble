import type Stripe from "stripe";
import { findPack, type CreditConfig } from "~/server/credits/config";
import type { PurchaseInput } from "~/server/credits/grants";
import type { ReversalInput, ReversalResult } from "~/server/credits/reversals";
import { logger } from "~/lib/logger";

export interface WebhookDeps {
  /** Any Stripe instance; only `webhooks.constructEvent` is used, no API call. */
  stripe: Stripe;
  /** STRIPE_WEBHOOK_SECRET, the `whsec_...` signing secret of the endpoint. */
  secret: string | undefined;
  config: CreditConfig;
  recordPurchase: (input: PurchaseInput) => Promise<{ duplicate: boolean }>;
  /** Takes back the credits of a refunded or disputed purchase. */
  recordReversal: (
    input: ReversalInput,
  ) => Promise<Pick<ReversalResult, "result">>;
}

export type WebhookResult =
  | "credited"
  | "duplicate"
  | "unpaid"
  | "ignored"
  | "rejected"
  | "reversed";

export interface WebhookResponse {
  status: number;
  body: { received: true; result: WebhookResult } | { error: string };
}

const CREDIT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

/** Events that take credits back: a refund, or a dispute opening. */
const REVERSAL_EVENTS = new Set(["charge.refunded", "charge.dispute.created"]);

const ok = (result: WebhookResult): WebhookResponse => ({
  status: 200,
  body: { received: true, result },
});

/** The purchase a paid session stands for, or null when it does not match a configured pack. */
function purchaseFrom(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  config: CreditConfig,
): PurchaseInput | null {
  const uid = session.client_reference_id ?? session.metadata?.uid;
  const pack = findPack(config, session.metadata?.packId ?? "");
  if (!uid || !pack) return null;
  // Checkout only sells USD packs at the configured price.
  if (session.amount_total !== pack.amountCents) return null;
  if (session.currency !== "usd") return null;
  return {
    uid,
    sessionId: session.id,
    eventId: event.id,
    eventType: event.type,
    ...(typeof session.payment_intent === "string"
      ? { paymentIntentId: session.payment_intent }
      : {}),
    packId: pack.id,
    amountMicros: pack.creditMicros,
    amountTotalCents: session.amount_total,
    currency: session.currency,
  };
}

/** The reversal a refund or dispute event asks for, or null without a PaymentIntent. */
function reversalFrom(event: Stripe.Event): ReversalInput | null {
  const base = { eventId: event.id, eventType: event.type };
  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const pi = charge.payment_intent;
    const paymentIntentId = typeof pi === "string" ? pi : pi?.id;
    if (!paymentIntentId) return null;
    return {
      ...base,
      paymentIntentId,
      source: { kind: "refund", refundedCents: charge.amount_refunded },
    };
  }
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    const pi = dispute.payment_intent;
    const paymentIntentId = typeof pi === "string" ? pi : pi?.id;
    if (!paymentIntentId) return null;
    return {
      ...base,
      paymentIntentId,
      source: {
        kind: "dispute",
        disputeId: dispute.id,
        amountCents: dispute.amount,
      },
    };
  }
  return null;
}

async function handleReversal(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookResponse> {
  const input = reversalFrom(event);
  if (!input) return ok("ignored");
  try {
    const { result } = await deps.recordReversal(input);
    if (result === "unmatched") {
      // The purchase may not be recorded yet (its event is still being
      // retried): answer 500 so Stripe delivers this event again later.
      logger.error("[Stripe] Refund or dispute matches no purchase yet", {
        eventId: event.id,
        paymentIntentId: input.paymentIntentId,
      });
      return {
        status: 500,
        body: { error: "No purchase for this payment yet" },
      };
    }
    return ok(result);
  } catch (error) {
    logger.error("[Stripe] Could not record the reversal", error);
    return { status: 500, body: { error: "Could not record the reversal" } };
  }
}

/**
 * POST /api/stripe/webhook. Verifies the Stripe-Signature header against
 * the raw body, then credits paid Checkout Sessions and takes the credits
 * back when a charge is refunded or disputed. Idempotent: the ledger
 * entry is keyed on the session id and the event id is stored, so a
 * redelivery answers "duplicate". Errors while writing answer 500 so Stripe
 * retries; events that can never be credited answer 200 so it stops.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  deps: WebhookDeps,
): Promise<WebhookResponse> {
  if (!deps.secret) {
    return { status: 503, body: { error: "Webhook secret is not set" } };
  }
  if (!signature) {
    return { status: 400, body: { error: "Missing Stripe-Signature header" } };
  }
  let event: Stripe.Event;
  try {
    event = deps.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      deps.secret,
    );
  } catch {
    return { status: 400, body: { error: "Invalid signature" } };
  }
  if (REVERSAL_EVENTS.has(event.type)) return handleReversal(event, deps);
  if (!CREDIT_EVENTS.has(event.type)) return ok("ignored");

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return ok("unpaid");
  const purchase = purchaseFrom(event, session, deps.config);
  if (!purchase) {
    logger.error("[Stripe] Paid session does not match a credit pack", {
      eventId: event.id,
      sessionId: session.id,
    });
    return ok("rejected");
  }
  try {
    const { duplicate } = await deps.recordPurchase(purchase);
    return ok(duplicate ? "duplicate" : "credited");
  } catch (error) {
    logger.error("[Stripe] Could not record purchase", error);
    return { status: 500, body: { error: "Could not record the purchase" } };
  }
}
