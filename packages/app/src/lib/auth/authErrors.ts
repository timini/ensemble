import type { SignInError } from "@/components/molecules/SignInPanel";

const BY_CODE: Record<string, SignInError> = {
  "auth/popup-closed-by-user": "popupClosed",
  "auth/cancelled-popup-request": "popupClosed",
  "auth/popup-blocked": "popupClosed",
  "auth/invalid-email": "invalidEmail",
  "auth/missing-email": "invalidEmail",
  "auth/network-request-failed": "network",
  "auth/invalid-action-code": "expiredLink",
  "auth/expired-action-code": "expiredLink",
};

/** Map a Firebase Auth error to a message the sign-in panel can show. */
export function toSignInError(error: unknown): SignInError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return BY_CODE[code] ?? "generic";
}
