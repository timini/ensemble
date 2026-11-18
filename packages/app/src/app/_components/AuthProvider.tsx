"use client";

import { createContext, useContext, useState } from "react";
import {
  useAuthController,
  type AuthController,
} from "~/hooks/useAuthController";
import { firebaseClientConfig } from "~/lib/auth/firebaseConfig";
import { useResetCreditsOnUserChange } from "~/hooks/useResetCreditsOnUserChange";

const AuthContext = createContext<AuthController | null>(null);

/**
 * Holds the Firebase Auth session for the whole app. Without the
 * NEXT_PUBLIC_FIREBASE_* config the status is `unavailable` and the
 * Firebase SDK is never loaded. Cached credits are dropped when the user
 * changes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [config] = useState(firebaseClientConfig);
  const auth = useAuthController(config);
  useResetCreditsOnUserChange(auth.user?.uid ?? null);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/** The auth session. Must be inside AuthProvider. */
export function useAuth(): AuthController {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
