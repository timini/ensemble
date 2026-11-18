import "server-only";

import Stripe from "stripe";
import { env } from "~/env";

let cached: Stripe | null | undefined;

/** The Stripe client from STRIPE_SECRET_KEY, or null when it is not set. */
export function getStripe(): Stripe | null {
  if (cached === undefined) {
    cached = env.STRIPE_SECRET_KEY
      ? new Stripe(env.STRIPE_SECRET_KEY, { appInfo: { name: "Ensemble AI" } })
      : null;
  }
  return cached;
}

/**
 * A Stripe instance for verifying webhook signatures, which needs no API
 * key. Uses the real client when there is one.
 */
export function getWebhookStripe(): Stripe {
  return getStripe() ?? new Stripe("sk_webhook_verification_only");
}
