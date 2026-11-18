import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_CREDIT_CONFIG } from "../config";
import { getCreditAccount, reserveCredits } from "../creditService";
import { InsufficientCreditsError } from "../errors";
import { recordPurchase } from "../grants";
import { COLLECTIONS } from "../ledger";
import { recordReversal } from "../reversals";

const app = initializeApp({ projectId: "demo-ensemble" }, "reversals-test");
const db = getFirestore(app);

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

const balance = async (uid = "buyer") =>
  (await getCreditAccount(db, DEFAULT_CREDIT_CONFIG, uid)).balanceMicros;

async function buyFivePack() {
  await recordPurchase(db, {
    uid: "buyer",
    sessionId: "cs_1",
    eventId: "evt_buy",
    paymentIntentId: "pi_1",
    packId: "usd-5",
    amountMicros: 5_000_000,
    amountTotalCents: 500,
    currency: "usd",
  });
}

const refund = (eventId: string, refundedCents: number) => ({
  eventId,
  eventType: "charge.refunded",
  paymentIntentId: "pi_1",
  source: { kind: "refund" as const, refundedCents },
});

const dispute = (eventId: string, amountCents = 500, disputeId = "dp_1") => ({
  eventId,
  eventType: "charge.dispute.created",
  paymentIntentId: "pi_1",
  source: { kind: "dispute" as const, disputeId, amountCents },
});

const disputeWon = (eventId: string, disputeId = "dp_1") => ({
  eventId,
  eventType: "charge.dispute.closed",
  paymentIntentId: "pi_1",
  source: { kind: "disputeWon" as const, disputeId },
});

describe("recordReversal", () => {
  it("takes back the credits of a refunded purchase once", async () => {
    await buyFivePack();
    expect(await recordReversal(db, refund("evt_r1", 500))).toEqual({
      result: "reversed",
      uid: "buyer",
      reversedMicros: 5_000_000,
      balanceMicros: 0,
    });
    expect((await recordReversal(db, refund("evt_r1", 500))).result).toBe(
      "duplicate",
    );
    // A second event that reports the same refund total takes nothing more.
    expect((await recordReversal(db, refund("evt_r2", 500))).result).toBe(
      "duplicate",
    );
    expect(await balance()).toBe(0);
    const entries = await db
      .collection(COLLECTIONS.ledger)
      .where("type", "==", "reversal")
      .get();
    expect(entries.size).toBe(1);
    expect(entries.docs[0]!.data()).toMatchObject({
      uid: "buyer",
      type: "reversal",
      amountMicros: -5_000_000,
      reason: "refund",
      stripeSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
      stripeEventId: "evt_r1",
    });
  });

  it("reverses partial refunds by what changed, never more than was bought", async () => {
    await buyFivePack();
    expect(
      (await recordReversal(db, refund("evt_r1", 200))).reversedMicros,
    ).toBe(2_000_000);
    expect(
      (await recordReversal(db, refund("evt_r2", 500))).reversedMicros,
    ).toBe(3_000_000);
    expect((await recordReversal(db, refund("evt_r3", 900))).result).toBe(
      "duplicate",
    );
    expect(await balance()).toBe(0);
  });

  it("lets the balance go negative when the credits were already spent, and then blocks Pro runs", async () => {
    await buyFivePack();
    await reserveCredits(db, {
      uid: "buyer",
      runId: "run-1",
      amountMicros: 4_000_000,
    });
    await recordReversal(db, {
      eventId: "evt_d1",
      eventType: "charge.dispute.created",
      paymentIntentId: "pi_1",
      source: { kind: "dispute", disputeId: "dp_1", amountCents: 500 },
    });
    expect(await balance()).toBe(-4_000_000);
    await expect(
      reserveCredits(db, { uid: "buyer", runId: "run-2", amountMicros: 0 }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("does not reverse twice when a refunded charge is also disputed", async () => {
    await buyFivePack();
    await recordReversal(db, refund("evt_r1", 300));
    const dispute = await recordReversal(db, {
      eventId: "evt_d1",
      eventType: "charge.dispute.created",
      paymentIntentId: "pi_1",
      source: { kind: "dispute", disputeId: "dp_1", amountCents: 500 },
    });
    expect(dispute.reversedMicros).toBe(2_000_000);
    expect(await balance()).toBe(0);
  });

  it("reports a charge it cannot match to a purchase", async () => {
    expect(
      (
        await recordReversal(db, {
          ...refund("evt_x", 500),
          paymentIntentId: "pi_unknown",
        })
      ).result,
    ).toBe("unmatched");
    const event = await db
      .collection(COLLECTIONS.stripeEvents)
      .doc("evt_x")
      .get();
    expect(event.exists).toBe(false);
  });

  it("gives the credits back once when a dispute is won", async () => {
    await buyFivePack();
    await recordReversal(db, dispute("evt_d1"));
    expect(await balance()).toBe(0);
    expect(await recordReversal(db, disputeWon("evt_w1"))).toEqual({
      result: "restored",
      uid: "buyer",
      reversedMicros: -5_000_000,
      balanceMicros: 5_000_000,
    });
    // The same event again, or another event for the same won dispute.
    expect((await recordReversal(db, disputeWon("evt_w1"))).result).toBe(
      "duplicate",
    );
    expect((await recordReversal(db, disputeWon("evt_w2"))).result).toBe(
      "duplicate",
    );
    // A late redelivery of the opening event takes nothing again.
    expect((await recordReversal(db, dispute("evt_d1b"))).result).toBe(
      "duplicate",
    );
    expect(await balance()).toBe(5_000_000);
    const restored = await db
      .collection(COLLECTIONS.ledger)
      .where("reason", "==", "dispute_won")
      .get();
    expect(restored.size).toBe(1);
    expect(restored.docs[0]!.data()).toMatchObject({
      uid: "buyer",
      type: "reversal",
      amountMicros: 5_000_000,
      stripeDisputeId: "dp_1",
      stripeEventId: "evt_w1",
    });
  });

  it("restores a balance that went negative while the dispute was open", async () => {
    await buyFivePack();
    await reserveCredits(db, {
      uid: "buyer",
      runId: "run-1",
      amountMicros: 4_000_000,
    });
    await recordReversal(db, dispute("evt_d1"));
    expect(await balance()).toBe(-4_000_000);
    await recordReversal(db, disputeWon("evt_w1"));
    expect(await balance()).toBe(1_000_000);
  });

  it("keeps a refund taken back when a dispute of the same money is won", async () => {
    await buyFivePack();
    await recordReversal(db, refund("evt_r1", 300));
    await recordReversal(db, dispute("evt_d1"));
    expect(await balance()).toBe(0);
    const won = await recordReversal(db, disputeWon("evt_w1"));
    expect(won.reversedMicros).toBe(-2_000_000);
    expect(await balance()).toBe(2_000_000);
  });

  it("takes nothing when the closing event arrives before the opening one", async () => {
    await buyFivePack();
    expect((await recordReversal(db, disputeWon("evt_w1"))).result).toBe(
      "duplicate",
    );
    expect((await recordReversal(db, dispute("evt_d1"))).result).toBe(
      "duplicate",
    );
    expect(await balance()).toBe(5_000_000);
  });

  it("only restores the dispute that was won", async () => {
    await buyFivePack();
    await recordReversal(db, dispute("evt_d1", 200, "dp_1"));
    await recordReversal(db, dispute("evt_d2", 300, "dp_2"));
    expect(await balance()).toBe(0);
    await recordReversal(db, disputeWon("evt_w1", "dp_1"));
    expect(await balance()).toBe(2_000_000);
  });
});
