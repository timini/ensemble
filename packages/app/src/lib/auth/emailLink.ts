/** localStorage key of the address a sign-in link was sent to. */
const EMAIL_KEY = "ensemble-email-for-sign-in";

/** Query parameters Firebase adds to an email sign-in link. */
const LINK_PARAMS = [
  "apiKey",
  "oobCode",
  "mode",
  "lang",
  "continueUrl",
  "tenantId",
];

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Remember the address on this device, so opening the link here signs in
 * without asking for it again (Firebase needs it to finish the link).
 */
export function rememberEmailForSignIn(email: string): void {
  storage()?.setItem(EMAIL_KEY, email);
}

export function recallEmailForSignIn(): string | null {
  return storage()?.getItem(EMAIL_KEY) ?? null;
}

export function forgetEmailForSignIn(): void {
  storage()?.removeItem(EMAIL_KEY);
}

/** Where the emailed link leads: the workspace, which finishes the sign-in. */
export function emailLinkContinueUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/workspace`;
}

/** The URL without the one-time link parameters, for history.replaceState. */
export function withoutEmailLinkParams(href: string): string {
  const url = new URL(href);
  for (const name of LINK_PARAMS) url.searchParams.delete(name);
  return url.toString();
}
