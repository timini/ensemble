import { describe, expect, it } from "vitest";
import {
  estimateRun,
  type PriceTable,
} from "@ensemble-ai/shared-utils/pricing";
import { applyMargin, chargeForEstimate, chargeForUsage } from "../pricing";

const TABLE: PriceTable = {
  source: "test",
  fetchedAt: "2026-11-01",
  models: {
    "openai/gpt-test": {
      inputPerMillion: 1,
      outputPerMillion: 2,
      openRouterId: "openai/gpt-test",
    },
    "google/gemini-test": {
      inputPerMillion: 0.5,
      outputPerMillion: 1,
      openRouterId: "google/gemini-test",
    },
  },
};

const models = [
  { provider: "openai", modelId: "gpt-test" },
  { provider: "google", modelId: "gemini-test" },
];

describe("applyMargin", () => {
  it("adds the margin and rounds up to whole micro-dollars", () => {
    expect(applyMargin(1, 30)).toBe(1_300_000);
    expect(applyMargin(0.000001, 30)).toBe(2);
    expect(applyMargin(0, 30)).toBe(0);
  });
});

describe("chargeForEstimate", () => {
  it("charges the high end of the estimate plus the margin", () => {
    const estimate = estimateRun({
      models,
      consensusMethod: "standard",
      summarizer: null,
      eloTopN: 3,
      embeddings: null,
      promptTokens: 100,
      table: TABLE,
    });
    const charge = chargeForEstimate(estimate, 30);
    expect(charge).toEqual({
      status: "priced",
      micros: applyMargin(estimate.cost.highUsd, 30),
    });
    if (charge.status === "priced") expect(charge.micros).toBeGreaterThan(0);
  });

  it("refuses to price a run with a model that has no price", () => {
    const estimate = estimateRun({
      models: [...models, { provider: "xai", modelId: "unknown" }],
      consensusMethod: "standard",
      summarizer: null,
      eloTopN: 3,
      embeddings: null,
      promptTokens: 100,
      table: TABLE,
    });
    expect(chargeForEstimate(estimate, 30)).toEqual({
      status: "unpriced",
      models: ["xai/unknown"],
    });
  });
});

describe("chargeForUsage", () => {
  it("prices reported tokens with the table and adds the margin", () => {
    const result = chargeForUsage(
      [
        {
          provider: "openai",
          modelId: "gpt-test",
          inputTokens: 1_000_000,
          outputTokens: 0,
          source: "reported",
        },
        {
          provider: "google",
          modelId: "gemini-test",
          inputTokens: 0,
          outputTokens: 1_000_000,
          source: "reported",
        },
      ],
      30,
      TABLE,
    );
    expect(result.costUsd).toBeCloseTo(2);
    expect(result.chargeMicros).toBe(2_600_000);
    expect(result.unpricedModels).toEqual([]);
  });

  it("lists unpriced calls and leaves them out of the charge", () => {
    const result = chargeForUsage(
      [
        {
          provider: "xai",
          modelId: "unknown",
          inputTokens: 10,
          outputTokens: 10,
          source: "reported",
        },
      ],
      30,
      TABLE,
    );
    expect(result.chargeMicros).toBe(0);
    expect(result.unpricedModels).toEqual(["xai/unknown"]);
  });
});
