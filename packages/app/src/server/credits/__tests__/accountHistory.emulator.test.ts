import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { DEFAULT_CREDIT_CONFIG } from "../config";
import { reserveCredits, settleRun } from "../creditService";
import { grantCredits, recordPurchase } from "../grants";
import { listPurchases } from "../accountHistory";
import { recordReversal } from "../reversals";

const app = initializeApp({ projectId: "demo-ensemble" }, "history-test");
const db = getFirestore(app);
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

async function runOnce(uid: string, runId: string) {
  await reserveCredits(db, { uid, runId, amountMicros: 100_000 });
  await settleRun(db, config, {
    uid,
    runId,
    calls: [
      {
        provider: "openai",
        modelId: "gpt-test",
        inputTokens: 1000,
        outputTokens: 1000,
        source: "reported",
      },
    ],
  });
}

describe("account history", () => {
  it("pages purchases, reversals and grants newest first, without run entries", async () => {
    await grantCredits(db, {
      uid: "u1",
      grantId: "welcome",
      amountMicros: 1_000_000,
      reason: "test",
    });
    await recordPurchase(db, {
      uid: "u1",
      sessionId: "cs_1",
      eventId: "evt_1",
      paymentIntentId: "pi_1",
      packId: "usd-5",
      amountMicros: 5_000_000,
      amountTotalCents: 500,
      currency: "usd",
    });
    await runOnce("u1", "run-a");
    await recordReversal(db, {
      eventId: "evt_r",
      eventType: "charge.refunded",
      paymentIntentId: "pi_1",
      source: { kind: "refund", refundedCents: 500 },
    });
    await grantCredits(db, {
      uid: "other",
      grantId: "x",
      amountMicros: 1,
      reason: "test",
    });

    const first = await listPurchases(db, "u1", { limit: 2 });
    expect(first.items.map((i) => i.type)).toEqual(["reversal", "purchase"]);
    expect(first.items[0]).toMatchObject({
      amountMicros: -5_000_000,
      reason: "refund",
    });
    expect(first.items[1]).toMatchObject({ packId: "usd-5" });
    expect(first.items[0]!.createdAtMs).toBeGreaterThan(0);
    expect(first.nextCursor).not.toBeNull();

    const second = await listPurchases(db, "u1", {
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.items.map((i) => i.type)).toEqual(["grant"]);
    expect(second.nextCursor).toBeNull();

    // Another user's entry is not a valid cursor.
    const foreign = await listPurchases(db, "other", {
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(foreign.items).toEqual([]);
  });
});
