import { describe, expect, it } from "vitest";
import { ProviderError } from "@ensemble-ai/shared-utils/providers";
import { toProError } from "../proErrors";

const trpcError = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(`server said ${code}`), { data: { code, ...extra } });

describe("toProError", () => {
  it("maps the Pro server's tRPC codes to error kinds", () => {
    expect(toProError(trpcError("PAYMENT_REQUIRED")).kind).toBe(
      "insufficient_credits",
    );
    expect(toProError(trpcError("GATEWAY_TIMEOUT")).kind).toBe("timeout");
    expect(toProError(trpcError("BAD_GATEWAY")).kind).toBe(
      "provider_unavailable",
    );
    expect(toProError(trpcError("CLIENT_CLOSED_REQUEST")).kind).toBe(
      "cancelled",
    );
    expect(toProError(trpcError("FORBIDDEN")).kind).toBe("other");
  });

  it("keeps the retry delay of a rate limit", () => {
    const error = toProError(
      trpcError("TOO_MANY_REQUESTS", { retryAfterSeconds: 12 }),
      "openai",
    );
    expect(error).toMatchObject({
      kind: "rate_limited",
      retryAfterSeconds: 12,
      provider: "openai",
    });
  });

  it("asks to sign in again when the session is gone", () => {
    expect(toProError(trpcError("UNAUTHORIZED"))).toMatchObject({
      kind: "other",
      message: "Sign in again to use Pro.",
    });
  });

  it("passes ProviderErrors through and classifies anything else", () => {
    const original = new ProviderError("x", "timeout");
    expect(toProError(original)).toBe(original);
    expect(toProError(new TypeError("Failed to fetch")).kind).toBe(
      "provider_unavailable",
    );
  });
});
