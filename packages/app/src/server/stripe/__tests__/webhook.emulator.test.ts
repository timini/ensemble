import { afterAll, beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_CREDIT_CONFIG } from "~/server/credits/config";
import { getCreditAccount } from "~/server/credits/creditService";
import { recordPurchase } from "~/server/credits/grants";
import { COLLECTIONS } from "~/server/credits/ledger";
import { handleStripeWebhook } from "../webhook";

const app = initializeApp(
  { projectId: "demo-ensemble" },
  "stripe-webhook-test",
);
const db = getFirestore(app);
const SECRET = "whsec_emulator_test";
const stripe = new Stripe("sk_test_unused");

const deps = {
  stripe,
  secret: SECRET,
  config: DEFAULT_CREDIT_CONFIG,
  recordPurchase: (input: Parameters<typeof recordPurchase>[1]) =>
    recordPurchase(db, input),
};

function signedEvent(eventId: string, type = "checkout.session.completed") {
  const body = JSON.stringify({
    id: eventId,
    object: "event",
    type,
    data: {
      object: {
        id: "cs_test_emulator",
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 2000,
        currency: "usd",
        client_reference_id: "buyer",
        metadata: { uid: "buyer", packId: "usd-20", creditMicros: "20000000" },
      },
    },
  });
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

describe("Stripe webhook against Firestore", () => {
  it("grants credits once for a redelivered event and for a second event on the same session", async () => {
    const first = signedEvent("evt_a");
    expect(
      (await handleStripeWebhook(first.body, first.signature, deps)).body,
    ).toEqual({ received: true, result: "credited" });
    expect(
      (await handleStripeWebhook(first.body, first.signature, deps)).body,
    ).toEqual({ received: true, result: "duplicate" });
    const second = signedEvent(
      "evt_b",
      "checkout.session.async_payment_succeeded",
    );
    expect(
      (await handleStripeWebhook(second.body, second.signature, deps)).body,
    ).toEqual({ received: true, result: "duplicate" });

    expect(
      (await getCreditAccount(db, DEFAULT_CREDIT_CONFIG, "buyer"))
        .balanceMicros,
    ).toBe(20_000_000);
    const ledger = await db
      .collection(COLLECTIONS.ledger)
      .where("uid", "==", "buyer")
      .get();
    expect(ledger.size).toBe(1);
    const events = await db.collection(COLLECTIONS.stripeEvents).get();
    expect(events.docs.map((d) => d.id).sort()).toEqual(["evt_a", "evt_b"]);
  });

  it("handles the same event delivered twice at once", async () => {
    const event = signedEvent("evt_race");
    const results = await Promise.all([
      handleStripeWebhook(event.body, event.signature, deps),
      handleStripeWebhook(event.body, event.signature, deps),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(
      (await getCreditAccount(db, DEFAULT_CREDIT_CONFIG, "buyer"))
        .balanceMicros,
    ).toBe(20_000_000);
  });
});
