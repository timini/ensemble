import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountStatus } from "@/components/molecules/AccountMenu";
import type { SignInError } from "@/components/molecules/SignInPanel";
import { toSignInError } from "~/lib/auth/authErrors";
import {
  emailLinkContinueUrl,
  forgetEmailForSignIn,
  recallEmailForSignIn,
  rememberEmailForSignIn,
  withoutEmailLinkParams,
} from "~/lib/auth/emailLink";
import {
  loadAuthClient,
  type AuthClient,
  type SignedInUser,
} from "~/lib/auth/firebaseClient";
import type { FirebaseClientConfig } from "~/lib/auth/firebaseConfig";
import { setIdTokenGetter } from "~/lib/auth/idToken";
import { logger } from "~/lib/logger";

export interface AuthController {
  status: AccountStatus;
  user: SignedInUser | null;
  /** A sign-in request is in flight. */
  pending: boolean;
  error: SignInError | null;
  emailSentTo: string | null;
  /** An email link was opened where the address is unknown; submitEmail finishes it. */
  confirmEmail: boolean;
  signInWithGoogle: () => Promise<void>;
  /** Send a sign-in link, or finish one when confirmEmail is set. */
  submitEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function clearLinkFromAddressBar() {
  window.history.replaceState(
    window.history.state,
    "",
    withoutEmailLinkParams(window.location.href),
  );
}

/**
 * Firebase Auth state for the app: Google and email-link sign-in, the
 * signed-in user, and the ID token getter used by tRPC and Stripe calls.
 * `config` null means sign-in is not set up (status `unavailable`).
 */
export function useAuthController(
  config: FirebaseClientConfig | null,
  load: (config: FirebaseClientConfig) => Promise<AuthClient> = loadAuthClient,
): AuthController {
  const [status, setStatus] = useState<AccountStatus>(
    config ? "loading" : "unavailable",
  );
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const client = useRef<AuthClient | null>(null);

  const run = useCallback(async (action: (c: AuthClient) => Promise<void>) => {
    const c = client.current;
    if (!c) return;
    setPending(true);
    setError(null);
    try {
      await action(c);
    } catch (err) {
      logger.warn("[auth] Sign-in step failed", err);
      setError(toSignInError(err));
    } finally {
      setPending(false);
    }
  }, []);

  const finishLink = useCallback(
    (email: string) =>
      run(async (c) => {
        await c.completeEmailLink(email, window.location.href);
        forgetEmailForSignIn();
        setConfirmEmail(false);
        clearLinkFromAddressBar();
      }),
    [run],
  );

  useEffect(() => {
    if (!config) return undefined;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    load(config)
      .then((c) => {
        if (cancelled) return;
        client.current = c;
        unsubscribe = c.onUserChanged((next) => {
          setUser(next);
          setStatus(next ? "signedIn" : "signedOut");
          setIdTokenGetter(next ? c.getIdToken : null);
        });
        if (c.isEmailLink(window.location.href)) {
          const remembered = recallEmailForSignIn();
          if (remembered) void finishLink(remembered);
          else setConfirmEmail(true);
        }
      })
      .catch((err: unknown) => {
        logger.error("[auth] Firebase Auth did not load", err);
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
      setIdTokenGetter(null);
    };
  }, [config, load, finishLink]);

  const signInWithGoogle = useCallback(
    () => run((c) => c.signInWithGoogle()),
    [run],
  );

  const submitEmail = useCallback(
    async (email: string) => {
      if (confirmEmail) return finishLink(email);
      return run(async (c) => {
        await c.sendEmailLink(
          email,
          emailLinkContinueUrl(
            window.location.origin,
            window.location.pathname,
            window.location.search,
          ),
        );
        rememberEmailForSignIn(email);
        setEmailSentTo(email);
      });
    },
    [confirmEmail, finishLink, run],
  );

  const signOut = useCallback(
    () =>
      run(async (c) => {
        await c.signOut();
        setEmailSentTo(null);
      }),
    [run],
  );

  return {
    status,
    user,
    pending,
    error,
    emailSentTo,
    confirmEmail,
    signInWithGoogle,
    submitEmail,
    signOut,
  };
}
