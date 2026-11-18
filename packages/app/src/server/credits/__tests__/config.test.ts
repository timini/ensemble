import { describe, expect, it } from "vitest";
import { DEFAULT_CREDIT_CONFIG, readCreditConfig } from "../config";

describe("readCreditConfig", () => {
  it("defaults to a 30% margin, a $1 warning and $5, $20 and $50 packs", () => {
    const config = readCreditConfig({});
    expect(config).toEqual(DEFAULT_CREDIT_CONFIG);
    expect(config.marginPercent).toBe(30);
    expect(config.lowBalanceMicros).toBe(1_000_000);
    expect(config.packs).toEqual([
      { id: "usd-5", amountCents: 500, creditMicros: 5_000_000 },
      { id: "usd-20", amountCents: 2000, creditMicros: 20_000_000 },
      { id: "usd-50", amountCents: 5000, creditMicros: 50_000_000 },
    ]);
  });

  it("reads the margin, the warning threshold and the packs from the environment", () => {
    const config = readCreditConfig({
      CREDIT_MARGIN_PERCENT: "45",
      CREDIT_LOW_BALANCE_USD: "2.5",
      CREDIT_PACKS_USD: "10, 25",
    });
    expect(config.marginPercent).toBe(45);
    expect(config.lowBalanceMicros).toBe(2_500_000);
    expect(config.packs.map((p) => p.id)).toEqual(["usd-10", "usd-25"]);
  });

  it("rejects values that would give credits away or break checkout", () => {
    expect(() => readCreditConfig({ CREDIT_MARGIN_PERCENT: "-5" })).toThrow(
      /CREDIT_MARGIN_PERCENT/,
    );
    expect(() => readCreditConfig({ CREDIT_MARGIN_PERCENT: "lots" })).toThrow(
      /CREDIT_MARGIN_PERCENT/,
    );
    expect(() => readCreditConfig({ CREDIT_LOW_BALANCE_USD: "-1" })).toThrow(
      /CREDIT_LOW_BALANCE_USD/,
    );
    expect(() => readCreditConfig({ CREDIT_PACKS_USD: "" })).not.toThrow();
    expect(() => readCreditConfig({ CREDIT_PACKS_USD: "5,abc" })).toThrow(
      /CREDIT_PACKS_USD/,
    );
    expect(() => readCreditConfig({ CREDIT_PACKS_USD: "0.25" })).toThrow(
      /CREDIT_PACKS_USD/,
    );
    expect(() => readCreditConfig({ CREDIT_PACKS_USD: "5,5" })).toThrow(
      /CREDIT_PACKS_USD/,
    );
  });
});
