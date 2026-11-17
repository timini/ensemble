import { describe, expect, it } from "vitest";
import { summarizerOrFallback } from "../summarizerChoice";

describe("summarizerOrFallback", () => {
  it("keeps a chosen summarizer", () => {
    expect(summarizerOrFallback("gpt-6-luna", "gpt-6-astra")).toBe(
      "gpt-6-luna",
    );
  });

  it("falls back when none is chosen, including an empty id from a preset", () => {
    expect(summarizerOrFallback(null, "gpt-6-astra")).toBe("gpt-6-astra");
    expect(summarizerOrFallback(undefined, "gpt-6-astra")).toBe("gpt-6-astra");
    expect(summarizerOrFallback("", "gpt-6-astra")).toBe("gpt-6-astra");
    expect(summarizerOrFallback("", undefined)).toBeUndefined();
  });
});
