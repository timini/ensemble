import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Performance: 10% in production, 100% in development
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session Replay: 1% of sessions, 100% on error
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],

    // Filter out ResizeObserver noise
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value ?? "";
      if (message.includes("ResizeObserver")) {
        return null;
      }
      return event;
    },
  });
}
