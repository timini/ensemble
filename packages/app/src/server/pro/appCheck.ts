import "server-only";

import { getAppCheck } from "firebase-admin/app-check";
import { getFirebaseApp } from "~/server/auth/firebaseAdmin";
import { logger } from "~/lib/logger";

/** Header the client sends its App Check token in (the Firebase convention). */
export const APP_CHECK_HEADER = "x-firebase-appcheck";

/**
 * Verify a Firebase App Check token. Returns false for a missing or invalid
 * token. Called only when APP_CHECK_ENFORCE is on.
 */
export async function verifyAppCheckToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    await getAppCheck(getFirebaseApp()).verifyToken(token);
    return true;
  } catch (error) {
    logger.warn("[App Check] Token verification failed", error);
    return false;
  }
}
