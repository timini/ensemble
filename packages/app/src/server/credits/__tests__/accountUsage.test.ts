import { describe, expect, it } from "vitest";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { summarizeRun, usageByModel, type UsageRecord } from "../accountUsage";

const TABLE: PriceTable = {
  source: "test",
  fetchedAt: "2026-11-01",
  models: {
    "openai/cheap": {
      inputPerMillion: 1,
      outputPerMillion: 1,
      openRouterId: "openai/cheap",
    },
    "anthropic/dear": {
      inputPerMillion: 3,
      outputPerMillion: 3,
      openRouterId: "anthropic/dear",
    },
  },
};

const call = (provider: string, modelId: string, tokens = 1000) => ({
  provider,
  modelId,
  inputTokens: tokens,
  outputTokens: tokens,
  source: "reported" as const,
});

const run: UsageRecord = {
  runId: "run-1",
  createdAtMs: 1_700_000_000_000,
  chargedMicros: 1_000,
  calls: [
    call("openai", "cheap"),
    call("anthropic", "dear"),
    call("openai", "cheap"),
  ],
};

describe("summarizeRun", () => {
  it("lists the models once, the calls, tokens and charge of a run", () => {
    expect(summarizeRun(run)).toEqual({
      runId: "run-1",
      createdAtMs: 1_700_000_000_000,
      chargedMicros: 1_000,
      callCount: 3,
      inputTokens: 3000,
      outputTokens: 3000,
      models: ["openai/cheap", "anthropic/dear"],
    });
  });
});

describe("usageByModel", () => {
  it("splits each run's charge between its models by their cost", () => {
    const rows = usageByModel([run], TABLE);
    expect(rows).toEqual([
      {
        model: "anthropic/dear",
        runs: 1,
        calls: 1,
        inputTokens: 1000,
        outputTokens: 1000,
        chargedMicros: 600,
      },
      {
        model: "openai/cheap",
        runs: 1,
        calls: 2,
        inputTokens: 2000,
        outputTokens: 2000,
        chargedMicros: 400,
      },
    ]);
  });

  it("adds up runs, and the shares always sum to what was charged", () => {
    const second: UsageRecord = {
      runId: "run-2",
      createdAtMs: 1_700_000_100_000,
      chargedMicros: 7,
      calls: [call("openai", "cheap"), call("anthropic", "dear", 333)],
    };
    const rows = usageByModel([run, second], TABLE);
    const cheap = rows.find((r) => r.model === "openai/cheap");
    expect(cheap).toMatchObject({ runs: 2, calls: 3 });
    expect(rows.reduce((sum, r) => sum + r.chargedMicros, 0)).toBe(1_007);
  });

  it("splits by calls when the run's models have no price", () => {
    const free: UsageRecord = {
      runId: "run-3",
      createdAtMs: 1,
      chargedMicros: 10,
      calls: [call("x", "a"), call("y", "b")],
    };
    expect(usageByModel([free], TABLE).map((r) => r.chargedMicros)).toEqual([
      5, 5,
    ]);
  });
});
