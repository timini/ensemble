import { logger } from "~/lib/logger";

type IdTokenGetter = () => Promise<string | null>;

let getter: IdTokenGetter | null = null;

/**
 * Set by the auth provider while a user is signed in, cleared on sign-out.
 * The tRPC client and the Stripe checkout call read the token through
 * getIdToken, so they need no React context.
 */
export function setIdTokenGetter(next: IdTokenGetter | null): void {
  getter = next;
}

/**
 * The current Firebase ID token (refreshed by the SDK when it nears expiry),
 * or null when signed out or when the refresh fails.
 */
export async function getIdToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch (error) {
    logger.warn("[auth] Could not get an ID token", error);
    return null;
  }
}
