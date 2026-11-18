// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { DEFAULT_CREDIT_CONFIG } from "~/server/credits/config";
import { handleStripeWebhook, type WebhookDeps } from "../webhook";

const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_unused");

function signed(payload: unknown) {
  const body = JSON.stringify(payload);
  return {
    body,
    signature: stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: SECRET,
    }),
  };
}

function deps(result = "reversed"): WebhookDeps {
  return {
    stripe,
    secret: SECRET,
    config: DEFAULT_CREDIT_CONFIG,
    recordPurchase: vi.fn(),
    recordReversal: vi.fn().mockResolvedValue({
      result,
      uid: "user-1",
      reversedMicros: 5_000_000,
      balanceMicros: 0,
    }),
  };
}

const refunded = (object: Record<string, unknown> = {}) =>
  signed({
    id: "evt_refund",
    object: "event",
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_1",
        object: "charge",
        payment_intent: "pi_1",
        amount: 500,
        amount_refunded: 500,
        currency: "usd",
        ...object,
      },
    },
  });

const disputed = signed({
  id: "evt_dispute",
  object: "event",
  type: "charge.dispute.created",
  data: {
    object: {
      id: "dp_1",
      object: "dispute",
      charge: "ch_1",
      payment_intent: "pi_1",
      amount: 500,
      currency: "usd",
    },
  },
});

describe("handleStripeWebhook: refunds and disputes", () => {
  it("reverses the credits of a refunded charge", async () => {
    const d = deps();
    const { body, signature } = refunded();
    expect((await handleStripeWebhook(body, signature, d)).body).toEqual({
      received: true,
      result: "reversed",
    });
    expect(d.recordReversal).toHaveBeenCalledWith({
      eventId: "evt_refund",
      eventType: "charge.refunded",
      paymentIntentId: "pi_1",
      source: { kind: "refund", refundedCents: 500 },
    });
  });

  it("reverses the disputed amount when a dispute opens", async () => {
    const d = deps();
    expect(
      (await handleStripeWebhook(disputed.body, disputed.signature, d)).body,
    ).toEqual({ received: true, result: "reversed" });
    expect(d.recordReversal).toHaveBeenCalledWith({
      eventId: "evt_dispute",
      eventType: "charge.dispute.created",
      paymentIntentId: "pi_1",
      source: { kind: "dispute", disputeId: "dp_1", amountCents: 500 },
    });
  });

  it("passes on a duplicate", async () => {
    const dup = refunded();
    expect(
      (await handleStripeWebhook(dup.body, dup.signature, deps("duplicate")))
        .body,
    ).toEqual({ received: true, result: "duplicate" });
  });

  it("asks Stripe to retry a charge whose purchase is not recorded yet", async () => {
    const early = refunded();
    expect(
      (
        await handleStripeWebhook(
          early.body,
          early.signature,
          deps("unmatched"),
        )
      ).status,
    ).toBe(500);
  });

  it("ignores a refund of a charge with no payment intent", async () => {
    const d = deps();
    const { body, signature } = refunded({ payment_intent: null });
    expect((await handleStripeWebhook(body, signature, d)).body).toEqual({
      received: true,
      result: "ignored",
    });
    expect(d.recordReversal).not.toHaveBeenCalled();
  });

  it("answers 500 so Stripe retries when the reversal cannot be written", async () => {
    const d = deps();
    d.recordReversal = vi.fn().mockRejectedValue(new Error("firestore down"));
    const { body, signature } = refunded();
    expect((await handleStripeWebhook(body, signature, d)).status).toBe(500);
  });
});
