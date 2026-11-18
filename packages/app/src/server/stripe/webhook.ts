import type Stripe from "stripe";
import { findPack, type CreditConfig } from "~/server/credits/config";
import type { PurchaseInput } from "~/server/credits/grants";
import { logger } from "~/lib/logger";

export interface WebhookDeps {
  /** Any Stripe instance; only `webhooks.constructEvent` is used, no API call. */
  stripe: Stripe;
  /** STRIPE_WEBHOOK_SECRET, the `whsec_...` signing secret of the endpoint. */
  secret: string | undefined;
  config: CreditConfig;
  recordPurchase: (input: PurchaseInput) => Promise<{ duplicate: boolean }>;
}

export type WebhookResult =
  | "credited"
  | "duplicate"
  | "unpaid"
  | "ignored"
  | "rejected";

export interface WebhookResponse {
  status: number;
  body: { received: true; result: WebhookResult } | { error: string };
}

const CREDIT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

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
    packId: pack.id,
    amountMicros: pack.creditMicros,
    amountTotalCents: session.amount_total,
    currency: session.currency,
  };
}

/**
 * POST /api/stripe/webhook. Verifies the Stripe-Signature header against
 * the raw body, then credits paid Checkout Sessions. Idempotent: the ledger
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
