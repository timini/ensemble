import { describe, expect, it } from "vitest";
import {
  balanceState,
  formatSignedCredits,
  formatTokens,
  modelLabel,
  toModelUsageItems,
  toPurchaseItems,
  toRunItems,
} from "../accountView";

describe("account view formatting", () => {
  it("signs amounts that move the balance", () => {
    expect(formatSignedCredits(5_000_000, "en")).toBe("+$5.00");
    expect(formatSignedCredits(-5_000_000, "en")).toBe("-$5.00");
  });

  it("shortens token counts", () => {
    expect(formatTokens(950, "en")).toBe("950");
    expect(formatTokens(182_400, "en")).toBe("182K");
  });

  it("names a model from the model list, or by its id", () => {
    expect(modelLabel("openai/gpt-6-luna")).toBe("GPT-6 Luna");
    expect(modelLabel("mystery/model-x")).toBe("model-x");
  });

  it("says whether the balance is fine, low or negative", () => {
    expect(balanceState({ balanceMicros: 5_000_000, lowBalance: false })).toBe(
      "ok",
    );
    expect(balanceState({ balanceMicros: 400_000, lowBalance: true })).toBe(
      "low",
    );
    expect(balanceState({ balanceMicros: -1, lowBalance: true })).toBe(
      "negative",
    );
  });

  it("turns ledger entries into purchase rows", () => {
    const rows = toPurchaseItems(
      [
        {
          id: "reversal__evt",
          type: "reversal",
          amountMicros: -5_000_000,
          createdAtMs: Date.UTC(2026, 10, 12),
          reason: "dispute",
        },
        {
          id: "purchase__cs",
          type: "purchase",
          amountMicros: 5_000_000,
          createdAtMs: Date.UTC(2026, 10, 3),
          packId: "usd-5",
        },
      ],
      [{ id: "usd-5", amountCents: 500 }],
      "en",
    );
    expect(rows[0]).toMatchObject({
      kind: "dispute",
      amount: "-$5.00",
      negative: true,
    });
    expect(rows[1]).toMatchObject({ kind: "purchase", pack: "$5" });
    expect(rows[1]!.date).toMatch(/Nov/);
  });

  it("turns usage into model rows with their share", () => {
    const rows = toModelUsageItems(
      [
        {
          model: "openai/gpt-6-luna",
          runs: 2,
          calls: 3,
          inputTokens: 1000,
          outputTokens: 500,
          chargedMicros: 300,
        },
        {
          model: "x/y",
          runs: 1,
          calls: 1,
          inputTokens: 10,
          outputTokens: 10,
          chargedMicros: 100,
        },
      ],
      "en",
    );
    expect(rows[0]).toMatchObject({
      id: "openai/gpt-6-luna",
      name: "GPT-6 Luna",
      tokens: "1.5K",
      share: 0.75,
    });
  });

  it("turns runs into rows with model names", () => {
    const [row] = toRunItems(
      [
        {
          runId: "r1",
          createdAtMs: Date.UTC(2026, 10, 12, 9, 41),
          chargedMicros: 90_000,
          callCount: 7,
          inputTokens: 1,
          outputTokens: 1,
          models: ["openai/gpt-6-luna", "x/y"],
        },
      ],
      "en",
    );
    expect(row).toMatchObject({
      id: "r1",
      models: ["GPT-6 Luna", "y"],
      calls: 7,
      amount: "$0.09",
    });
  });
});
