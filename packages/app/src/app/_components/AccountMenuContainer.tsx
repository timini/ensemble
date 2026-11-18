"use client";

import { AccountMenu } from "@/components/molecules/AccountMenu";
import { useAuth } from "./AuthProvider";

/**
 * The header account menu wired to the auth session. Sign-in is only
 * needed for Pro, sharing and synced history; Free mode works signed out.
 */
export function AccountMenuContainer() {
  const auth = useAuth();
  return (
    <AccountMenu
      status={auth.status}
      user={auth.user}
      onSignOut={() => void auth.signOut()}
      // Open straight away when an email link needs the address to finish.
      key={auth.confirmEmail ? "confirm" : "default"}
      defaultOpen={auth.confirmEmail}
      signIn={{
        onGoogle: () => void auth.signInWithGoogle(),
        onEmailLink: (email) => void auth.submitEmail(email),
        emailSentTo: auth.emailSentTo,
        confirmEmail: auth.confirmEmail,
        pending: auth.pending,
        error: auth.error,
      }}
    />
  );
}
