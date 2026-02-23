import "server-only";

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

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
  } catch {
    return null;
  }
}
