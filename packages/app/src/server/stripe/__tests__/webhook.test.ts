// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { DEFAULT_CREDIT_CONFIG } from "~/server/credits/config";
import { handleStripeWebhook, type WebhookDeps } from "../webhook";

const SECRET = "fake-webhook-secret-unit";
const stripe = new Stripe("fake-stripe-key-unused");

function sessionEvent(
  overrides: Record<string, unknown> = {},
  type = "checkout.session.completed",
  id = "evt_1",
) {
  return {
    id,
    object: "event",
    type,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 500,
        currency: "usd",
        client_reference_id: "user-1",
        payment_intent: "pi_test_1",
        metadata: { uid: "user-1", packId: "usd-5", creditMicros: "5000000" },
        ...overrides,
      },
    },
  };
}

function signed(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  return {
    body,
    signature: stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret,
    }),
  };
}

function deps(overrides: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    stripe,
    secret: SECRET,
    config: DEFAULT_CREDIT_CONFIG,
    recordPurchase: vi
      .fn()
      .mockResolvedValue({ duplicate: false, balanceMicros: 5_000_000 }),
    recordReversal: vi.fn(),
    ...overrides,
  };
}

describe("handleStripeWebhook", () => {
  it("credits a paid Checkout Session once, from a correctly signed event", async () => {
    const d = deps();
    const { body, signature } = signed(sessionEvent());
    const res = await handleStripeWebhook(body, signature, d);
    expect(res).toEqual({
      status: 200,
      body: { received: true, result: "credited" },
    });
    expect(d.recordPurchase).toHaveBeenCalledWith({
      uid: "user-1",
      sessionId: "cs_test_1",
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      paymentIntentId: "pi_test_1",
      packId: "usd-5",
      amountMicros: 5_000_000,
      amountTotalCents: 500,
      currency: "usd",
    });
  });

  it("reports a repeated event as a duplicate", async () => {
    const d = deps({
      recordPurchase: vi
        .fn()
        .mockResolvedValue({ duplicate: true, balanceMicros: 5 }),
    });
    const { body, signature } = signed(sessionEvent());
    expect((await handleStripeWebhook(body, signature, d)).body).toEqual({
      received: true,
      result: "duplicate",
    });
  });

  it("rejects a missing or wrong signature and a changed body", async () => {
    const d = deps();
    const { body, signature } = signed(sessionEvent());
    expect((await handleStripeWebhook(body, null, d)).status).toBe(400);
    expect(
      (
        await handleStripeWebhook(
          body,
          signed(sessionEvent(), "whsec_other").signature,
          d,
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleStripeWebhook(body.replace("500", "50000"), signature, d))
        .status,
    ).toBe(400);
    expect(d.recordPurchase).not.toHaveBeenCalled();
  });

  it("answers 503 when the webhook secret is not configured", async () => {
    const { body, signature } = signed(sessionEvent());
    expect(
      (await handleStripeWebhook(body, signature, deps({ secret: undefined })))
        .status,
    ).toBe(503);
  });

  it("waits for an unpaid session and ignores other event types", async () => {
    const d = deps();
    const unpaid = signed(sessionEvent({ payment_status: "unpaid" }));
    expect(
      (await handleStripeWebhook(unpaid.body, unpaid.signature, d)).body,
    ).toEqual({ received: true, result: "unpaid" });
    const other = signed({
      id: "evt_2",
      object: "event",
      type: "customer.created",
      data: { object: {} },
    });
    expect(
      (await handleStripeWebhook(other.body, other.signature, d)).body,
    ).toEqual({ received: true, result: "ignored" });
    expect(d.recordPurchase).not.toHaveBeenCalled();
  });

  it("credits a delayed payment when it succeeds", async () => {
    const d = deps();
    const { body, signature } = signed(
      sessionEvent({}, "checkout.session.async_payment_succeeded", "evt_3"),
    );
    expect((await handleStripeWebhook(body, signature, d)).body).toEqual({
      received: true,
      result: "credited",
    });
  });

  it("refuses to credit a session whose pack or amount does not match the config", async () => {
    const d = deps();
    const unknownPack = signed(
      sessionEvent({ metadata: { uid: "user-1", packId: "usd-999" } }),
    );
    expect(
      (await handleStripeWebhook(unknownPack.body, unknownPack.signature, d))
        .body,
    ).toEqual({ received: true, result: "rejected" });
    const wrongAmount = signed(sessionEvent({ amount_total: 1 }));
    expect(
      (await handleStripeWebhook(wrongAmount.body, wrongAmount.signature, d))
        .body,
    ).toEqual({ received: true, result: "rejected" });
    const euro = signed(sessionEvent({ currency: "eur" }));
    expect(
      (await handleStripeWebhook(euro.body, euro.signature, d)).body,
    ).toEqual({ received: true, result: "rejected" });
    const noUser = signed(
      sessionEvent({
        client_reference_id: null,
        metadata: { packId: "usd-5" },
      }),
    );
    expect(
      (await handleStripeWebhook(noUser.body, noUser.signature, d)).body,
    ).toEqual({ received: true, result: "rejected" });
    expect(d.recordPurchase).not.toHaveBeenCalled();
  });

  it("answers 500 so Stripe retries when the ledger write fails", async () => {
    const d = deps({
      recordPurchase: vi.fn().mockRejectedValue(new Error("firestore down")),
    });
    const { body, signature } = signed(sessionEvent());
    expect((await handleStripeWebhook(body, signature, d)).status).toBe(500);
  });
});
