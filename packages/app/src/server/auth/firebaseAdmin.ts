import "server-only";

import { env } from "~/env";
import { logger } from "~/lib/logger";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return initializeApp({
    ...(projectId ? { projectId } : {}),
  });
}

export async function verifyFirebaseAuthToken(
  idToken: string,
): Promise<AuthUser | null> {
  if (!idToken) {
    return null;
  }

  try {
    const decoded: DecodedIdToken = await getAuth(getFirebaseApp()).verifyIdToken(
      idToken,
      true,
    );
    const email = asOptionalString(decoded.email);
    const name = asOptionalString(decoded.name);
    const picture = asOptionalString(decoded.picture);

    return {
      uid: decoded.uid,
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      ...(picture ? { picture } : {}),
    };
  } catch (error) {
    logger.error("[Firebase Auth] Token verification failed", error);
    return null;
  }
}
