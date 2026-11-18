// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { DEFAULT_CREDIT_CONFIG } from "~/server/credits/config";
import { handleCheckoutRequest, type CheckoutDeps } from "../checkout";

function fakeStripe(
  url: string | null = "https://checkout.stripe.test/c/pay/cs_test_1",
) {
  const create = vi.fn().mockResolvedValue({ id: "cs_test_1", url });
  return {
    stripe: { checkout: { sessions: { create } } } as unknown as Stripe,
    create,
  };
}

function request(body: unknown, token: string | null = "good-token") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("https://ensemble.test/api/stripe/checkout", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function deps(overrides: Partial<CheckoutDeps> = {}): CheckoutDeps {
  return {
    stripe: fakeStripe().stripe,
    config: DEFAULT_CREDIT_CONFIG,
    verifyToken: async (token) =>
      token === "good-token" ? { uid: "user-1", email: "a@example.com" } : null,
    appUrl: undefined,
    ...overrides,
  };
}

describe("handleCheckoutRequest", () => {
  it("creates a Checkout Session for a signed-in user and a known pack", async () => {
    const { stripe, create } = fakeStripe();
    const res = await handleCheckoutRequest(
      request({ packId: "usd-20" }),
      deps({ stripe }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://checkout.stripe.test/c/pay/cs_test_1",
    });
    const params = create.mock
      .calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
    expect(params).toMatchObject({
      mode: "payment",
      client_reference_id: "user-1",
      customer_email: "a@example.com",
      metadata: { uid: "user-1", packId: "usd-20", creditMicros: "20000000" },
      success_url:
        "https://ensemble.test/workspace?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://ensemble.test/workspace?checkout=cancelled",
    });
    expect(params.line_items?.[0]).toMatchObject({
      quantity: 1,
      price_data: { currency: "usd", unit_amount: 2000 },
    });
  });

  it("uses APP_URL for the return links when it is set", async () => {
    const { stripe, create } = fakeStripe();
    await handleCheckoutRequest(
      request({ packId: "usd-5" }),
      deps({ stripe, appUrl: "https://app.example.com/" }),
    );
    const params = create.mock
      .calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
    expect(params.cancel_url).toBe(
      "https://app.example.com/workspace?checkout=cancelled",
    );
  });

  it("refuses a request with no or a bad token", async () => {
    expect(
      (await handleCheckoutRequest(request({ packId: "usd-5" }, null), deps()))
        .status,
    ).toBe(401);
    expect(
      (await handleCheckoutRequest(request({ packId: "usd-5" }, "bad"), deps()))
        .status,
    ).toBe(401);
  });

  it("refuses an unknown pack or a malformed body", async () => {
    expect(
      (await handleCheckoutRequest(request({ packId: "usd-1000" }), deps()))
        .status,
    ).toBe(400);
    expect(
      (await handleCheckoutRequest(request("not json"), deps())).status,
    ).toBe(400);
    expect((await handleCheckoutRequest(request({}), deps())).status).toBe(400);
  });

  it("answers 503 when Stripe is not configured", async () => {
    const res = await handleCheckoutRequest(
      request({ packId: "usd-5" }),
      deps({ stripe: null }),
    );
    expect(res.status).toBe(503);
  });

  it("answers 502 when Stripe returns no payment page", async () => {
    const res = await handleCheckoutRequest(
      request({ packId: "usd-5" }),
      deps({ stripe: fakeStripe(null).stripe }),
    );
    expect(res.status).toBe(502);
  });

  it("refuses to start a checkout in production without APP_URL, so return links cannot follow a forged Host", async () => {
    const { stripe, create } = fakeStripe();
    const res = await handleCheckoutRequest(
      request({ packId: "usd-5" }),
      deps({ stripe, appUrl: undefined, requireAppUrl: true }),
    );
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 413 for an oversized body", async () => {
    const res = await handleCheckoutRequest(
      request({ packId: "usd-5", padding: "x".repeat(20_000) }),
      deps(),
    );
    expect(res.status).toBe(413);
  });
});
