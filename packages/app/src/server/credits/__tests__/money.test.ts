import { describe, expect, it } from "vitest";
import {
  centsToMicros,
  formatMicrosUsd,
  MICROS_PER_USD,
  usdToMicrosCeil,
} from "../money";

describe("money", () => {
  it("counts a dollar as one million micro-dollars", () => {
    expect(MICROS_PER_USD).toBe(1_000_000);
    expect(centsToMicros(500)).toBe(5_000_000);
  });

  it("rounds a USD amount up to whole micro-dollars, ignoring float noise", () => {
    expect(usdToMicrosCeil(0.0000011)).toBe(2);
    expect(usdToMicrosCeil(1.3)).toBe(1_300_000);
    expect(usdToMicrosCeil(0.1 + 0.2)).toBe(300_000);
    expect(usdToMicrosCeil(0)).toBe(0);
  });

  it("refuses negative and non-finite amounts", () => {
    expect(() => usdToMicrosCeil(-1)).toThrow();
    expect(() => usdToMicrosCeil(Number.NaN)).toThrow();
  });

  it("formats micro-dollars as dollars for logs and errors", () => {
    expect(formatMicrosUsd(1_234_567)).toBe("$1.234567");
  });
});
