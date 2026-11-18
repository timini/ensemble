import "server-only";

import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getFirebaseApp } from "~/server/auth/firebaseAdmin";

/** Firestore through firebase-admin. Server code only; it bypasses the security rules. */
export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}
