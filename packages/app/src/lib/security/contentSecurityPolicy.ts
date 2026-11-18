/**
 * The Content-Security-Policy of every page, set per request by
 * `src/middleware.ts` with a fresh nonce. Next adds the nonce to its own
 * scripts; the root layout adds it to the theme script.
 *
 * - script-src: scripts need the nonce. `'strict-dynamic'` lets those
 *   scripts load others (Next chunks, the Firebase Auth helper, reCAPTCHA
 *   for App Check), and makes browsers ignore `'self'`, which stays only
 *   for very old ones. No `'unsafe-eval'` outside development.
 * - connect-src: `https:` plus this machine on any port. Free mode calls six
 *   provider APIs, OpenRouter and any OpenAI-compatible endpoint the user
 *   adds, straight from the browser; those endpoints are kept in the
 *   browser, so the server cannot list them. A host allowlist would break
 *   custom endpoints, so the policy allows any HTTPS origin and local
 *   servers (Ollama, LM Studio, the Firebase emulators). Plain HTTP to
 *   another machine stays blocked, which an HTTPS page blocks anyway as
 *   mixed content. The XSS defence is therefore the script policy, not
 *   connect-src (docs/security-review-m6.md).
 * - style-src keeps `'unsafe-inline'`: React sets `style` attributes and
 *   Radix positions popovers with them.
 */
export interface ContentSecurityPolicyOptions {
  nonce: string;
  /** `next dev`: React Refresh needs eval. */
  dev: boolean;
  /** NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, whose helper iframe sign-in uses. */
  authDomain: string | null;
}

// CSP has no syntax for IPv6 literals, so http://[::1] cannot be listed.
const LOCAL_HTTP = ["http://localhost:*", "http://127.0.0.1:*"];

function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

export function contentSecurityPolicy({
  nonce,
  dev,
  authDomain,
}: ContentSecurityPolicyOptions): string {
  const authFrame = !authDomain
    ? []
    : isLocalHost(authDomain)
      ? LOCAL_HTTP
      : [`https://${authDomain}`];
  const policy: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https:", ...LOCAL_HTTP],
    "frame-src": [
      "'self'",
      ...authFrame,
      "https://www.google.com/recaptcha/",
      "https://recaptcha.google.com/recaptcha/",
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(policy)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/** 128 random bits, base64: a nonce for one response. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
