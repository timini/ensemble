import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { DEFAULT_CREDIT_CONFIG } from "../config";
import {
  getCreditAccount,
  refundRun,
  reserveCredits,
  settleRun,
} from "../creditService";
import { grantCredits, recordPurchase } from "../grants";
import { InsufficientCreditsError, LedgerStateError } from "../errors";
import { COLLECTIONS } from "../ledger";

const app = initializeApp(
  { projectId: "demo-ensemble" },
  "credit-service-test",
);
const db = getFirestore(app);
const PROJECT = "demo-ensemble";

const TABLE: PriceTable = {
  source: "test",
  fetchedAt: "2026-11-01",
  models: {
    "openai/gpt-test": {
      inputPerMillion: 1,
      outputPerMillion: 2,
      openRouterId: "openai/gpt-test",
    },
  },
};
const config = { ...DEFAULT_CREDIT_CONFIG, priceTable: TABLE };

async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host)
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set; run npm run test:emulator",
    );
  await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    {
      method: "DELETE",
    },
  );
}

async function ledgerFor(uid: string) {
  const snap = await db
    .collection(COLLECTIONS.ledger)
    .where("uid", "==", uid)
    .get();
  return snap.docs.map(
    (d) => d.data() as { type: string; amountMicros: number },
  );
}

beforeEach(clearFirestore);
afterAll(() => deleteApp(app));

describe("getCreditAccount", () => {
  it("reports a new user with a zero balance and a low-balance warning", async () => {
    const account = await getCreditAccount(db, config, "new-user");
    expect(account).toEqual({
      uid: "new-user",
      balanceMicros: 0,
      lowBalance: true,
      lowBalanceThresholdMicros: config.lowBalanceMicros,
    });
  });

  it("stops warning once the balance reaches the threshold", async () => {
    await grantCredits(db, {
      uid: "u1",
      grantId: "welcome",
      amountMicros: config.lowBalanceMicros,
      reason: "test",
    });
    const account = await getCreditAccount(db, config, "u1");
    expect(account.lowBalance).toBe(false);
  });
});

describe("grants and purchases", () => {
  it("adds credits once per grant id", async () => {
    await grantCredits(db, {
      uid: "u1",
      grantId: "welcome",
      amountMicros: 500,
      reason: "test",
    });
    const again = await grantCredits(db, {
      uid: "u1",
      grantId: "welcome",
      amountMicros: 500,
      reason: "test",
    });
    expect(again.duplicate).toBe(true);
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(500);
    expect(await ledgerFor("u1")).toHaveLength(1);
  });

  it("adds a purchase once per Checkout Session", async () => {
    const purchase = {
      uid: "u1",
      sessionId: "cs_test_1",
      eventId: "evt_1",
      packId: "usd-5",
      amountMicros: 5_000_000,
      amountTotalCents: 500,
      currency: "usd",
    };
    expect((await recordPurchase(db, purchase)).duplicate).toBe(false);
    expect(
      (await recordPurchase(db, { ...purchase, eventId: "evt_2" })).duplicate,
    ).toBe(true);
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(
      5_000_000,
    );
    const [entry] = await ledgerFor("u1");
    expect(entry).toMatchObject({
      type: "purchase",
      amountMicros: 5_000_000,
      balanceAfterMicros: 5_000_000,
      stripeSessionId: "cs_test_1",
    });
  });
});

describe("reserve, settle and refund", () => {
  beforeEach(async () => {
    await grantCredits(db, {
      uid: "u1",
      grantId: "seed",
      amountMicros: 10_000_000,
      reason: "test",
    });
  });

  it("refuses a reservation larger than the balance and writes nothing", async () => {
    await expect(
      reserveCredits(db, {
        uid: "u1",
        runId: "run-1",
        amountMicros: 10_000_001,
      }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(
      10_000_000,
    );
    expect(await ledgerFor("u1")).toHaveLength(1);
  });

  it("holds the reservation once per run id", async () => {
    const first = await reserveCredits(db, {
      uid: "u1",
      runId: "run-1",
      amountMicros: 3_000_000,
    });
    const second = await reserveCredits(db, {
      uid: "u1",
      runId: "run-1",
      amountMicros: 3_000_000,
    });
    expect(first).toEqual({
      duplicate: false,
      reservedMicros: 3_000_000,
      balanceMicros: 7_000_000,
    });
    expect(second).toEqual({
      duplicate: true,
      reservedMicros: 3_000_000,
      balanceMicros: 7_000_000,
    });
  });

  it("settles at the actual cost plus margin and gives back the rest", async () => {
    await reserveCredits(db, {
      uid: "u1",
      runId: "run-1",
      amountMicros: 3_000_000,
    });
    const calls = [
      {
        provider: "openai",
        modelId: "gpt-test",
        inputTokens: 1_000_000,
        outputTokens: 0,
        source: "reported" as const,
      },
    ];
    const settled = await settleRun(db, config, {
      uid: "u1",
      runId: "run-1",
      calls,
    });
    // $1 of model cost with a 30% margin.
    expect(settled).toMatchObject({
      duplicate: false,
      chargedMicros: 1_300_000,
      releasedMicros: 1_700_000,
    });
    expect(settled.balanceMicros).toBe(8_700_000);
    const again = await settleRun(db, config, {
      uid: "u1",
      runId: "run-1",
      calls,
    });
    expect(again.duplicate).toBe(true);
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(
      8_700_000,
    );

    const usage = await db.collection(COLLECTIONS.usage).doc("u1__run-1").get();
    expect(usage.data()).toMatchObject({
      uid: "u1",
      runId: "run-1",
      chargedMicros: 1_300_000,
      marginPercent: 30,
    });
    expect((await ledgerFor("u1")).map((e) => e.type).sort()).toEqual([
      "grant",
      "reserve",
      "settle",
    ]);
  });

  it("never charges more than was reserved", async () => {
    await reserveCredits(db, { uid: "u1", runId: "run-1", amountMicros: 100 });
    const calls = [
      {
        provider: "openai",
        modelId: "gpt-test",
        inputTokens: 1_000_000,
        outputTokens: 0,
        source: "reported" as const,
      },
    ];
    const settled = await settleRun(db, config, {
      uid: "u1",
      runId: "run-1",
      calls,
    });
    expect(settled).toMatchObject({
      chargedMicros: 100,
      releasedMicros: 0,
      balanceMicros: 9_999_900,
    });
  });

  it("refunds a failed run in full, once, and then refuses to settle it", async () => {
    await reserveCredits(db, {
      uid: "u1",
      runId: "run-1",
      amountMicros: 3_000_000,
    });
    const refund = await refundRun(db, {
      uid: "u1",
      runId: "run-1",
      reason: "provider error",
    });
    expect(refund).toEqual({
      duplicate: false,
      refundedMicros: 3_000_000,
      balanceMicros: 10_000_000,
    });
    expect(
      (await refundRun(db, { uid: "u1", runId: "run-1", reason: "again" }))
        .duplicate,
    ).toBe(true);
    await expect(
      settleRun(db, config, { uid: "u1", runId: "run-1", calls: [] }),
    ).rejects.toBeInstanceOf(LedgerStateError);
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(
      10_000_000,
    );
  });

  it("refuses to refund a settled run or to settle a run with no reservation", async () => {
    await expect(
      settleRun(db, config, { uid: "u1", runId: "missing", calls: [] }),
    ).rejects.toBeInstanceOf(LedgerStateError);
    await reserveCredits(db, { uid: "u1", runId: "run-1", amountMicros: 1000 });
    await settleRun(db, config, { uid: "u1", runId: "run-1", calls: [] });
    await expect(
      refundRun(db, { uid: "u1", runId: "run-1", reason: "late" }),
    ).rejects.toBeInstanceOf(LedgerStateError);
  });

  it("keeps concurrent reservations within the balance", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        reserveCredits(db, {
          uid: "u1",
          runId: `run-${i}`,
          amountMicros: 3_000_000,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(
      1_000_000,
    );
  });

  it("rejects run ids that could collide with other ledger ids", async () => {
    await expect(
      reserveCredits(db, { uid: "u1", runId: "a/b", amountMicros: 1 }),
    ).rejects.toThrow(/run id/);
    await expect(
      reserveCredits(db, { uid: "u1", runId: "x", amountMicros: -1 }),
    ).rejects.toThrow(/amount/);
  });

  it("keeps the cached balance equal to the sum of the ledger", async () => {
    await reserveCredits(db, {
      uid: "u1",
      runId: "run-1",
      amountMicros: 2_000_000,
    });
    await refundRun(db, { uid: "u1", runId: "run-1", reason: "x" });
    await reserveCredits(db, {
      uid: "u1",
      runId: "run-2",
      amountMicros: 2_000_000,
    });
    await settleRun(db, config, { uid: "u1", runId: "run-2", calls: [] });
    const sum = (await ledgerFor("u1")).reduce(
      (total, e) => total + e.amountMicros,
      0,
    );
    expect((await getCreditAccount(db, config, "u1")).balanceMicros).toBe(sum);
  });
});
