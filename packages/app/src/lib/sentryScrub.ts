/**
 * Removes secrets and user content from Sentry events before they are sent:
 * auth and App Check tokens, Stripe signatures and cookies in request
 * headers, request bodies (prompts) and query strings. Used as `beforeSend`
 * by the client, server and edge Sentry configs.
 */

/** Request headers that never leave the server in an event. */
const SECRET_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-firebase-appcheck",
  "stripe-signature",
  "proxy-authorization",
]);

interface ScrubbableEvent {
  request?: {
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
}

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  const request = event.request;
  if (request) {
    if (request.headers) {
      for (const name of Object.keys(request.headers)) {
        if (SECRET_HEADERS.has(name.toLowerCase()))
          delete request.headers[name];
      }
    }
    delete request.cookies;
    delete request.data;
    delete request.query_string;
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.data && "url" in crumb.data && typeof crumb.data.url === "string")
      crumb.data.url = crumb.data.url.split("?")[0];
  }
  return event;
}

/**
 * Share of requests traced: NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE (0 to 1),
 * or 0.1 in production and 1 elsewhere.
 */
export function tracesSampleRate(
  env: { rate?: string; nodeEnv?: string } = {
    rate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    nodeEnv: process.env.NODE_ENV,
  },
): number {
  const rate = Number(env.rate);
  if (env.rate && Number.isFinite(rate) && rate >= 0 && rate <= 1) return rate;
  return env.nodeEnv === "production" ? 0.1 : 1.0;
}
