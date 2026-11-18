import { type NextRequest } from "next/server";
import { env } from "~/env";
import { verifyFirebaseAuthToken } from "~/server/auth/firebaseAdmin";
import { getCreditConfig } from "~/server/credits";
import { handleCheckoutRequest } from "~/server/stripe/checkout";
import { getStripe } from "~/server/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start a Stripe Checkout for a credit pack. See handleCheckoutRequest. */
export function POST(req: NextRequest) {
  return handleCheckoutRequest(req, {
    stripe: getStripe(),
    config: getCreditConfig(),
    verifyToken: verifyFirebaseAuthToken,
    appUrl: env.APP_URL,
  });
}
