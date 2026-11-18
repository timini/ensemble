import { afterAll, beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_CREDIT_CONFIG } from "~/server/credits/config";
import { getCreditAccount } from "~/server/credits/creditService";
import { recordPurchase } from "~/server/credits/grants";
import { recordReversal } from "~/server/credits/reversals";
import { handleStripeWebhook, type WebhookDeps } from "../webhook";

const app = initializeApp(
  { projectId: "demo-ensemble" },
  "stripe-webhook-reversal-test",
);
const db = getFirestore(app);
const SECRET = "fake-webhook-secret-emulator";
const stripe = new Stripe("fake-stripe-key-unused");

const deps: WebhookDeps = {
  stripe,
  secret: SECRET,
  config: DEFAULT_CREDIT_CONFIG,
  recordPurchase: (input) => recordPurchase(db, input),
  recordReversal: (input) => recordReversal(db, input),
};

function signed(id: string, type: string, object: Record<string, unknown>) {
  const body = JSON.stringify({ id, object: "event", type, data: { object } });
  return {
    body,
    signature: stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: SECRET,
    }),
  };
}

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host)
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set; run npm run test:emulator",
    );
  await fetch(
    `http://${host}/emulator/v1/projects/demo-ensemble/databases/(default)/documents`,
    { method: "DELETE" },
  );
});
afterAll(() => deleteApp(app));

describe("Stripe refunds against Firestore", () => {
  it("takes the credits back when the payment is refunded, once", async () => {
    const paid = signed("evt_paid", "checkout.session.completed", {
      id: "cs_emulator",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 2000,
      currency: "usd",
      client_reference_id: "buyer",
      payment_intent: "pi_emulator",
      metadata: { uid: "buyer", packId: "usd-20", creditMicros: "20000000" },
    });
    await handleStripeWebhook(paid.body, paid.signature, deps);
    const refunded = signed("evt_refunded", "charge.refunded", {
      id: "ch_emulator",
      object: "charge",
      payment_intent: "pi_emulator",
      amount: 2000,
      amount_refunded: 2000,
      currency: "usd",
    });
    const send = () =>
      handleStripeWebhook(refunded.body, refunded.signature, deps);
    expect((await send()).body).toEqual({ received: true, result: "reversed" });
    expect((await send()).body).toEqual({
      received: true,
      result: "duplicate",
    });
    const account = await getCreditAccount(db, DEFAULT_CREDIT_CONFIG, "buyer");
    expect(account.balanceMicros).toBe(0);
  });

  it("gives the credits back when Stripe closes a dispute as won", async () => {
    const paid = signed("evt_paid", "checkout.session.completed", {
      id: "cs_dispute",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      client_reference_id: "buyer",
      payment_intent: "pi_dispute",
      metadata: { uid: "buyer", packId: "usd-5" },
    });
    await handleStripeWebhook(paid.body, paid.signature, deps);
    const object = {
      id: "dp_emulator",
      object: "dispute",
      charge: "ch_dispute",
      payment_intent: "pi_dispute",
      amount: 500,
      currency: "usd",
    };
    const opened = signed("evt_opened", "charge.dispute.created", {
      ...object,
      status: "needs_response",
    });
    const closed = signed("evt_closed", "charge.dispute.closed", {
      ...object,
      status: "won",
    });
    const balance = async () =>
      (await getCreditAccount(db, DEFAULT_CREDIT_CONFIG, "buyer"))
        .balanceMicros;
    expect(
      (await handleStripeWebhook(opened.body, opened.signature, deps)).body,
    ).toEqual({ received: true, result: "reversed" });
    expect(await balance()).toBe(0);
    const send = () => handleStripeWebhook(closed.body, closed.signature, deps);
    expect((await send()).body).toEqual({ received: true, result: "restored" });
    expect((await send()).body).toEqual({
      received: true,
      result: "duplicate",
    });
    expect(await balance()).toBe(5_000_000);
  });
});
