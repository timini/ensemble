import type { FirebaseApp } from "firebase/app";
import { logger } from "~/lib/logger";

/** Public App Check settings, inlined by Next at build time. */
export interface AppCheckEnv {
  /** reCAPTCHA Enterprise site key. Without it App Check stays off. */
  NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?: string;
  /** Debug token for local development and CI, registered in the Firebase console. */
  NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN?: string;
}

export interface AppCheckConfig {
  siteKey: string;
  debugToken?: string;
}

export function readAppCheckConfig(env: AppCheckEnv): AppCheckConfig | null {
  const siteKey = env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey) return null;
  const debugToken = env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
  return { siteKey, ...(debugToken ? { debugToken } : {}) };
}

/** The config of this build. Each variable is named in full so Next inlines it. */
export function appCheckConfig(): AppCheckConfig | null {
  return readAppCheckConfig({
    NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
    NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN:
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN,
  });
}

type TokenGetter = () => Promise<string | null>;
let getter: TokenGetter | null = null;

/** Set once App Check has started; Pro calls read the token through getAppCheckToken. */
export function setAppCheckTokenGetter(next: TokenGetter | null): void {
  getter = next;
}

/** The current App Check token, or null when App Check is off or failing. */
export async function getAppCheckToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch (error) {
    logger.warn("[App Check] Could not get a token", error);
    return null;
  }
}

/**
 * Start Firebase App Check with reCAPTCHA Enterprise on the Firebase app
 * sign-in uses, when a site key is configured. The server checks the token
 * on Pro calls only when APP_CHECK_ENFORCE is on (docs/DEPLOYMENT.md).
 */
export async function startAppCheck(
  app: FirebaseApp,
  config: AppCheckConfig | null = appCheckConfig(),
): Promise<void> {
  if (!config || typeof window === "undefined") return;
  if (config.debugToken) {
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = config.debugToken;
  }
  const sdk = await import("firebase/app-check");
  const appCheck = sdk.initializeAppCheck(app, {
    provider: new sdk.ReCaptchaEnterpriseProvider(config.siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  setAppCheckTokenGetter(
    async () => (await sdk.getToken(appCheck, false)).token,
  );
}
