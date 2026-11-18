import { getIdToken } from "~/lib/auth/idToken";

const MICROS_PER_USD = 1_000_000;

/** A credit amount (integer micro-dollars) as money, with sub-cent digits for tiny amounts. */
export function formatCredits(micros: number, locale: string): string {
  const tiny = micros > 0 && micros < 10_000;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: tiny ? 4 : 2,
    maximumFractionDigits: tiny ? 4 : 2,
  }).format(micros / MICROS_PER_USD);
}

/** A pack price in cents: "$5", or "$12.50" when it has cents. */
export function formatPackPrice(cents: number, locale: string): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Start a Stripe Checkout for a credit pack (POST /api/stripe/checkout)
 * and return the payment page URL. Throws with the server's message.
 */
export async function startCheckout(packId: string): Promise<string> {
  const token = await getIdToken();
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ packId }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !body.url)
    throw new Error(body.error ?? "Checkout could not start.");
  return body.url;
}
