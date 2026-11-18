import { type NextRequest } from "next/server";
import { env } from "~/env";
import {
  getCreditConfig,
  recordPurchase,
  recordReversal,
} from "~/server/credits";
import { getAdminFirestore } from "~/server/firebase/firestore";
import { getWebhookStripe } from "~/server/stripe/client";
import { handleStripeWebhook } from "~/server/stripe/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. Reads the raw body as text, untouched, because
 * the signature is computed over the exact bytes Stripe sent.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const { status, body } = await handleStripeWebhook(
    rawBody,
    req.headers.get("stripe-signature"),
    {
      stripe: getWebhookStripe(),
      secret: env.STRIPE_WEBHOOK_SECRET,
      config: getCreditConfig(),
      recordPurchase: (input) => recordPurchase(getAdminFirestore(), input),
      recordReversal: (input) => recordReversal(getAdminFirestore(), input),
    },
  );
  return Response.json(body, { status });
}
