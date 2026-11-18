import { useState } from "react";
import { startCheckout } from "~/lib/credits";

/**
 * Buying a credit pack: starts Stripe Checkout and sends the browser to
 * the payment page, keeping which pack is starting and whether it failed.
 */
export function useCreditCheckout() {
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState(false);
  const onBuy = (packId: string) => {
    setPendingPackId(packId);
    setBuyError(false);
    startCheckout(packId)
      .then((url) => window.location.assign(url))
      .catch(() => {
        setBuyError(true);
        setPendingPackId(null);
      });
  };
  return { onBuy, pendingPackId, buyError };
}
