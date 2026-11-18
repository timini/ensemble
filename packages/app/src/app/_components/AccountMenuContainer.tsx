"use client";

import type { ReactNode } from "react";
import { AccountMenu } from "@/components/molecules/AccountMenu";
import type { SignInPanelProps } from "@/components/molecules/SignInPanel";
import type { AuthController } from "~/hooks/useAuthController";
import { useAuth } from "./AuthProvider";

/** SignInPanel props wired to the auth session (header menu, Pro sign-in prompts). */
export function signInPanelProps(auth: AuthController): SignInPanelProps {
  return {
    onGoogle: () => void auth.signInWithGoogle(),
    onEmailLink: (email) => void auth.submitEmail(email),
    emailSentTo: auth.emailSentTo,
    confirmEmail: auth.confirmEmail,
    pending: auth.pending,
    error: auth.error,
  };
}

/**
 * The header account menu wired to the auth session. Sign-in is only
 * needed for Pro, sharing and synced history; Free mode works signed out.
 * `children` shows while signed in (the Pro credit balance).
 */
export function AccountMenuContainer({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  return (
    <AccountMenu
      status={auth.status}
      user={auth.user}
      onSignOut={() => void auth.signOut()}
      // Open straight away when an email link needs the address to finish.
      key={auth.confirmEmail ? "confirm" : "default"}
      defaultOpen={auth.confirmEmail}
      signIn={signInPanelProps(auth)}
    >
      {children}
    </AccountMenu>
  );
}
