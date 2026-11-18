import { firebaseClientConfig } from "~/lib/auth/firebaseConfig";

/**
 * Whether this deployment offers Pro mode.
 *
 * Pro needs sign-in (the Firebase web config) and a server that can bill
 * and call models (Stripe and OpenRouter keys). The server keys are not
 * visible to the browser, so the deployment opts in with
 * NEXT_PUBLIC_PRO_ENABLED=true once they are set. Until then the landing
 * page, onboarding and settings show Pro as coming soon.
 */
export function isProEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_PRO_ENABLED === "true" &&
    firebaseClientConfig() !== null
  );
}
