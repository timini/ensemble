import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, tracesSampleRate } from "./src/lib/sentryScrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    // No IP addresses, cookies or user data by default.
    sendDefaultPii: false,
    // Tokens, prompts and query strings never leave in an event.
    beforeSend: (event) => scrubSentryEvent(event),

    // Performance: 10% in production, 100% in development
    tracesSampleRate: tracesSampleRate(),
  });
}
