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

/** Pages an emailed link may return to; the app finishes the sign-in on any of them. */
const RETURN_PATHS = ["/workspace", "/account"];

/**
 * Where the emailed link leads: the page it was asked for on when that is
 * the account page, otherwise the workspace.
 */
export function emailLinkContinueUrl(origin: string, pathname = ""): string {
  const path = RETURN_PATHS.includes(pathname) ? pathname : "/workspace";
  return `${origin.replace(/\/+$/, "")}${path}`;
}

/** The URL without the one-time link parameters, for history.replaceState. */
export function withoutEmailLinkParams(href: string): string {
  const url = new URL(href);
  for (const name of LINK_PARAMS) url.searchParams.delete(name);
  return url.toString();
}
