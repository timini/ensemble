import type Stripe from "stripe";
import { z } from "zod";
import type { AuthUser } from "~/server/auth/firebaseAdmin";
import { findPack, type CreditConfig } from "~/server/credits/config";
import { BodyTooLargeError, readBodyLimited } from "~/server/http/bodyLimit";

/** Largest checkout request body; it only carries a pack id. */
export const MAX_CHECKOUT_BODY_BYTES = 4096;

export interface CheckoutDeps {
  /** Null when STRIPE_SECRET_KEY is not set. */
  stripe: Stripe | null;
  config: CreditConfig;
  verifyToken: (idToken: string) => Promise<AuthUser | null>;
  /** Public origin for the return links; the request's origin when unset. */
  appUrl: string | undefined;
  /**
   * True in production: without APP_URL no checkout starts, so the return
   * links never come from the request's Host header.
   */
  requireAppUrl?: boolean;
}

const body = z.object({ packId: z.string().min(1).max(32) });

function json(status: number, payload: unknown): Response {
  return Response.json(payload, { status });
}

function bearer(req: Request): string | null {
  const [scheme, token] = (req.headers.get("authorization") ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/**
 * POST /api/stripe/checkout. A signed-in user picks a credit pack; the
 * answer is the URL of a Stripe-hosted Checkout page. The pack and the user
 * travel in the session metadata, and the webhook credits the ledger once
 * Stripe reports the payment. No credits are granted here.
 */
export async function handleCheckoutRequest(
  req: Request,
  deps: CheckoutDeps,
): Promise<Response> {
  const token = bearer(req);
  const user = token ? await deps.verifyToken(token) : null;
  if (!user) return json(401, { error: "Sign in to buy credits" });
  if (!deps.stripe || (deps.requireAppUrl && !deps.appUrl))
    return json(503, { error: "Payments are not set up" });

  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(
      JSON.parse(await readBodyLimited(req, MAX_CHECKOUT_BODY_BYTES)),
    );
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return json(413, { error: "Request too large" });
    return json(400, { error: "Expected a JSON body with a packId" });
  }
  const pack = findPack(deps.config, parsed.packId);
  if (!pack) return json(400, { error: "Unknown credit pack" });

  const origin = (deps.appUrl ?? new URL(req.url).origin).replace(/\/+$/, "");
  const metadata = {
    uid: user.uid,
    packId: pack.id,
    creditMicros: String(pack.creditMicros),
  };
  const session = await deps.stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.uid,
    ...(user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.amountCents,
          product_data: {
            name: `Ensemble AI credits ($${pack.amountCents / 100})`,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/workspace?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/workspace?checkout=cancelled`,
  });
  if (!session.url)
    return json(502, { error: "Stripe returned no payment page" });
  return json(200, { url: session.url });
}
