/**
 * Firestore initialization (lazy singleton)
 *
 * Uses Application Default Credentials (ADC) on Firebase App Hosting.
 * For local dev, set GOOGLE_APPLICATION_CREDENTIALS or use
 * `gcloud auth application-default login`.
 *
 * When FIREBASE_PROJECT_ID is not set, Firestore is unavailable and
 * callers should handle the null return gracefully.
 */

import "server-only";

import type FirebaseAdmin from "firebase-admin";
import { logger } from "~/lib/logger";

type Firestore = FirebaseFirestore.Firestore;

let firestoreInstance: Firestore | null = null;
let initAttempted = false;

export function getFirestore(): Firestore | null {
  if (initAttempted) return firestoreInstance;
  initAttempted = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    logger.debug(
      "[Firestore] FIREBASE_PROJECT_ID not set — share feature unavailable",
    );
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require("firebase-admin") as typeof FirebaseAdmin;

    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId });
    }

    firestoreInstance = admin.firestore();
    logger.debug("[Firestore] Initialized for project: %s", projectId);
    return firestoreInstance;
  } catch (error) {
    logger.error("[Firestore] Failed to initialize:", error);
    return null;
  }
}
