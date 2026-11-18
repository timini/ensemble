import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, tracesSampleRate } from "./src/lib/sentryScrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    sendDefaultPii: false,

    // Performance: 10% in production, 100% in development
    tracesSampleRate: tracesSampleRate(),

    // Session Replay: 1% of sessions, 100% on error
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    // Replays mask all text and inputs (API keys are typed into inputs)
    // and block media. Stated here so a default change cannot expose them.
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out ResizeObserver noise
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value ?? "";
      if (message.includes("ResizeObserver")) {
        return null;
      }
      return scrubSentryEvent(event);
    },
  });
}
