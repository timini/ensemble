import { NextResponse, type NextRequest } from "next/server";
import { firebaseClientConfig } from "~/lib/auth/firebaseConfig";
import {
  contentSecurityPolicy,
  createNonce,
} from "~/lib/security/contentSecurityPolicy";

/**
 * Sets the Content-Security-Policy of every page with a fresh nonce. The
 * policy also goes on the request, where Next reads the nonce and adds it
 * to the scripts it renders; `x-nonce` carries it to the root layout. API
 * routes, the Sentry tunnel and static files keep the fixed headers of
 * next.config.mjs.
 */
export function middleware(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === "development",
    authDomain: firebaseClientConfig()?.options.authDomain ?? null,
  });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api/|monitoring|_next/static|_next/image|favicon\\.ico|locales/).*)",
      // Prefetches render nothing that runs, and skipping them keeps
      // their responses cacheable.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
