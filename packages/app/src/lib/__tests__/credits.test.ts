import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCredits, formatPackPrice, startCheckout } from "../credits";

vi.mock("~/lib/auth/idToken", () => ({
  getIdToken: vi.fn(async () => "id-token"),
}));

describe("credit formatting", () => {
  it("formats a balance in dollars, with more digits under a cent", () => {
    expect(formatCredits(5_000_000, "en")).toBe("$5.00");
    expect(formatCredits(4_200, "en")).toBe("$0.0042");
    expect(formatCredits(0, "en")).toBe("$0.00");
    expect(formatCredits(1_500_000, "fr")).toMatch(/1,50/);
  });

  it("formats a pack price without cents when it is whole", () => {
    expect(formatPackPrice(500, "en")).toBe("$5");
    expect(formatPackPrice(1250, "en")).toBe("$12.50");
  });
});

describe("startCheckout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the pack with the ID token and returns the payment page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/x" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(startCheckout("usd-5")).resolves.toBe(
      "https://checkout.stripe.com/x",
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/stripe/checkout");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer id-token",
    );
    expect(JSON.parse(init.body as string)).toEqual({ packId: "usd-5" });
  });

  it("throws the server's message when checkout cannot start", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Payments are not set up" }), {
          status: 503,
        }),
      ),
    );
    await expect(startCheckout("usd-5")).rejects.toThrow(
      "Payments are not set up",
    );
  });
});
