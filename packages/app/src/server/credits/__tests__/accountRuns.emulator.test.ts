import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { DEFAULT_CREDIT_CONFIG } from "../config";
import { reserveCredits, settleRun } from "../creditService";
import { grantCredits } from "../grants";
import { listRuns, modelUsageSince } from "../accountHistory";

const app = initializeApp({ projectId: "demo-ensemble" }, "history-runs-test");
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

describe("account history: runs", () => {
  it("pages settled runs and sums usage per model", async () => {
    await grantCredits(db, {
      uid: "u1",
      grantId: "seed",
      amountMicros: 1_000_000,
      reason: "test",
    });
    for (const id of ["run-1", "run-2", "run-3"]) await runOnce("u1", id);

    const first = await listRuns(db, "u1", { limit: 2 });
    expect(first.items.map((r) => r.runId)).toEqual(["run-3", "run-2"]);
    expect(first.items[0]).toMatchObject({
      callCount: 1,
      models: ["openai/gpt-test"],
    });
    expect(first.nextCursor).toBe("run-2");
    const second = await listRuns(db, "u1", { limit: 2, cursor: "run-2" });
    expect(second.items.map((r) => r.runId)).toEqual(["run-1"]);
    expect(second.nextCursor).toBeNull();

    const report = await modelUsageSince(db, "u1", {
      sinceMs: Date.now() - 60_000,
      maxRuns: 2,
    });
    expect(report.runCount).toBe(2);
    expect(report.truncated).toBe(true);
    expect(report.models).toHaveLength(1);
    expect(report.models[0]).toMatchObject({
      model: "openai/gpt-test",
      runs: 2,
      calls: 2,
    });
    expect(report.models[0]!.chargedMicros).toBe(
      first.items[0]!.chargedMicros + first.items[1]!.chargedMicros,
    );
  });
});
