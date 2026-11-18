import { describe, expect, it } from "vitest";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { quoteRun, type RunQuoteInput } from "../runBilling";

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

const input: RunQuoteInput = {
  models: [
    { provider: "openai", modelId: "gpt-test" },
    { provider: "openai", modelId: "gpt-test" },
  ],
  consensusMethod: "standard",
  summarizer: null,
  eloTopN: 3,
  embeddings: null,
  promptTokens: 200,
};

describe("quoteRun", () => {
  it("says whether the balance covers the run and whether it is low", () => {
    const quote = quoteRun(
      input,
      { marginPercent: 30, lowBalanceMicros: 1_000_000, priceTable: TABLE },
      5_000_000,
    );
    expect(quote.status).toBe("priced");
    if (quote.status !== "priced") return;
    expect(quote.requiredMicros).toBeGreaterThan(0);
    expect(quote.canAfford).toBe(true);
    expect(quote.lowBalance).toBe(false);
    expect(quote.balanceMicros).toBe(5_000_000);
  });

  it("blocks a run the balance cannot cover (FR-036)", () => {
    const quote = quoteRun(
      input,
      { marginPercent: 30, lowBalanceMicros: 1_000_000, priceTable: TABLE },
      1,
    );
    expect(quote).toMatchObject({
      status: "priced",
      canAfford: false,
      lowBalance: true,
    });
  });

  it("charges more with a larger margin", () => {
    const low = quoteRun(
      input,
      { marginPercent: 0, lowBalanceMicros: 0, priceTable: TABLE },
      0,
    );
    const high = quoteRun(
      input,
      { marginPercent: 100, lowBalanceMicros: 0, priceTable: TABLE },
      0,
    );
    if (low.status !== "priced" || high.status !== "priced")
      throw new Error("expected priced");
    expect(high.requiredMicros).toBeGreaterThanOrEqual(
      2 * low.requiredMicros - 1,
    );
  });

  it("refuses models with no price", () => {
    const quote = quoteRun(
      { ...input, models: [{ provider: "xai", modelId: "nope" }] },
      { marginPercent: 30, lowBalanceMicros: 0, priceTable: TABLE },
      10,
    );
    expect(quote).toEqual({
      status: "unpriced",
      models: ["xai/nope"],
      balanceMicros: 10,
    });
  });
});
