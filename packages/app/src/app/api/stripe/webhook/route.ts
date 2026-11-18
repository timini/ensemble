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
import { BodyTooLargeError, readBodyLimited } from "~/server/http/bodyLimit";

/** Stripe events are a few kilobytes; anything far larger is not from Stripe. */
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. Reads the raw body as text, untouched, because
 * the signature is computed over the exact bytes Stripe sent. Bodies over
 * 256 KiB are refused before the signature is checked.
 */
export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await readBodyLimited(req, MAX_WEBHOOK_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return Response.json({ error: "Request too large" }, { status: 413 });
    throw error;
  }
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
