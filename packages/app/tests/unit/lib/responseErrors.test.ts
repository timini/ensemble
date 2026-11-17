import { describe, expect, it } from "vitest";
import { ProviderError } from "@ensemble-ai/shared-utils/providers";
import { toResponseError } from "~/lib/responseErrors";

describe("toResponseError", () => {
  it("keeps the kind and retry delay of a ProviderError", () => {
    const error = new ProviderError("429 slow down", "rate_limited", {
      retryAfterSeconds: 9,
    });
    expect(toResponseError(error)).toEqual({
      message: "429 slow down",
      details: { kind: "rate_limited", retryAfterSeconds: 9 },
    });
  });

  it("classifies a plain error", () => {
    expect(
      toResponseError(new Error("API key for openai is missing")).details.kind,
    ).toBe("other");
    expect(
      toResponseError(new Error("Missing API key for openai.")).details.kind,
    ).toBe("invalid_key");
    expect(toResponseError(new TypeError("Failed to fetch")).details.kind).toBe(
      "provider_unavailable",
    );
  });

  it("handles non-errors", () => {
    expect(toResponseError("boom")).toEqual({
      message: "boom",
      details: { kind: "other", retryAfterSeconds: null },
    });
  });
});
