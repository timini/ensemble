import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  createNonce,
} from "../security/contentSecurityPolicy";

/** The policy as a map from directive to its sources. */
function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...sources] = d.split(/\s+/);
        return [name!, sources];
      }),
  );
}

const prod = directives(
  contentSecurityPolicy({ nonce: "abc123", dev: false, authDomain: null }),
);

describe("contentSecurityPolicy", () => {
  it("only runs scripts that carry the request's nonce, and never eval in production", () => {
    expect(prod["script-src"]).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'strict-dynamic'",
    ]);
    expect(prod["script-src"]).not.toContain("'unsafe-eval'");
    expect(prod["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("allows eval only in development, for React Refresh", () => {
    const dev = directives(
      contentSecurityPolicy({ nonce: "n", dev: true, authDomain: null }),
    );
    expect(dev["script-src"]).toContain("'unsafe-eval'");
  });

  it("lets the browser reach provider APIs, Pro, Sentry and endpoints on this machine", () => {
    expect(prod["connect-src"]).toEqual([
      "'self'",
      "https:",
      "http://localhost:*",
      "http://127.0.0.1:*",
    ]);
  });

  it("keeps the page out of frames and plugins and pins base and form targets", () => {
    expect(prod["default-src"]).toEqual(["'self'"]);
    expect(prod["frame-ancestors"]).toEqual(["'none'"]);
    expect(prod["object-src"]).toEqual(["'none'"]);
    expect(prod["base-uri"]).toEqual(["'self'"]);
    expect(prod["form-action"]).toEqual(["'self'"]);
  });

  it("frames only the Firebase auth helper and reCAPTCHA", () => {
    const withAuth = directives(
      contentSecurityPolicy({
        nonce: "n",
        dev: false,
        authDomain: "ensemble-prod.firebaseapp.com",
      }),
    );
    expect(withAuth["frame-src"]).toEqual([
      "'self'",
      "https://ensemble-prod.firebaseapp.com",
      "https://www.google.com/recaptcha/",
      "https://recaptcha.google.com/recaptcha/",
    ]);
    expect(prod["frame-src"]).not.toContain("https://null");
  });

  it("allows the Auth emulator's helper frame when the auth domain is local", () => {
    const local = directives(
      contentSecurityPolicy({
        nonce: "n",
        dev: false,
        authDomain: "localhost",
      }),
    );
    expect(local["frame-src"]).toContain("http://localhost:*");
  });

  it("makes a fresh base64 nonce each time", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a.length).toBeGreaterThanOrEqual(22);
    expect(createNonce()).not.toBe(a);
  });
});
