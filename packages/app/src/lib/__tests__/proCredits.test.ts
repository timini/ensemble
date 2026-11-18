import { describe, expect, it } from "vitest";
import { proCreditState } from "../proCredits";

const account = { balanceMicros: 5_000_000, lowBalance: false };

describe("proCreditState", () => {
  it("blocks Ask until the user signs in", () => {
    expect(proCreditState({ auth: "signedOut" })).toEqual({
      block: "signIn",
      notice: null,
    });
    expect(proCreditState({ auth: "unavailable" })).toEqual({
      block: "unavailable",
      notice: null,
    });
    expect(proCreditState({ auth: "loading" })).toEqual({
      block: "loading",
      notice: null,
    });
  });

  it("allows a run the balance covers, with no notice", () => {
    expect(
      proCreditState({
        auth: "signedIn",
        account,
        quote: {
          status: "priced",
          requiredMicros: 1000,
          balanceMicros: 5_000_000,
          canAfford: true,
          lowBalance: false,
        },
      }),
    ).toEqual({ block: null, notice: null });
  });

  it("warns under the low-balance threshold (FR-038) without blocking", () => {
    expect(
      proCreditState({
        auth: "signedIn",
        account: { balanceMicros: 500_000, lowBalance: true },
        quote: {
          status: "priced",
          requiredMicros: 1000,
          balanceMicros: 500_000,
          canAfford: true,
          lowBalance: true,
        },
      }),
    ).toEqual({
      block: null,
      notice: { variant: "low", balanceMicros: 500_000 },
    });
  });

  it("blocks a run the balance cannot cover (FR-036)", () => {
    expect(
      proCreditState({
        auth: "signedIn",
        account: { balanceMicros: 100, lowBalance: true },
        quote: {
          status: "priced",
          requiredMicros: 1000,
          balanceMicros: 100,
          canAfford: false,
          lowBalance: true,
        },
      }),
    ).toEqual({
      block: "insufficient",
      notice: {
        variant: "insufficient",
        balanceMicros: 100,
        requiredMicros: 1000,
      },
    });
  });

  it("blocks a run with models Pro cannot price", () => {
    expect(
      proCreditState({
        auth: "signedIn",
        account,
        quote: {
          status: "unpriced",
          models: ["ollama/llama3"],
          balanceMicros: 5_000_000,
        },
      }),
    ).toEqual({
      block: "unpriced",
      notice: {
        variant: "unpriced",
        balanceMicros: 5_000_000,
        unpricedModels: ["ollama/llama3"],
      },
    });
  });

  it("reports a balance that could not load, and waits while it loads", () => {
    expect(proCreditState({ auth: "signedIn", accountError: true })).toEqual({
      block: "error",
      notice: { variant: "error" },
    });
    expect(proCreditState({ auth: "signedIn" })).toEqual({
      block: "loading",
      notice: null,
    });
  });

  it("does not block on a quote still loading once the balance is known", () => {
    expect(proCreditState({ auth: "signedIn", account })).toEqual({
      block: null,
      notice: null,
    });
  });
});
