/**
 * Error state of model answers in the response slice: the error kinds, and
 * the load-time step that marks streams cut off by a reload as interrupted.
 */
import type { ModelResponse } from "./responseTypes";

/**
 * Why an answer failed: a provider error kind from shared-utils, or
 * `interrupted` when the page was reloaded mid-stream.
 */
export type ResponseErrorKind =
  | "invalid_key"
  | "missing_key"
  | "rate_limited"
  | "timeout"
  | "provider_unavailable"
  | "interrupted"
  | "other";

export interface ResponseErrorDetails {
  kind: ResponseErrorKind;
  retryAfterSeconds?: number | null;
}

/** Stored message for an answer cut off by a reload (the UI explains it by kind). */
export const INTERRUPTED_ERROR_MESSAGE =
  "The page was reloaded before this answer finished.";

/**
 * Runs on persisted state as the store loads. A fresh page has no live
 * streams, so an answer stored as streaming was cut off by a reload or a
 * closed tab: mark it as an `interrupted` error so it can be retried instead
 * of showing a spinner for ever.
 */
export function markInterruptedStreams<
  T extends { responses?: ModelResponse[] },
>(stored: T): T {
  if (!Array.isArray(stored.responses)) return stored;
  if (!stored.responses.some((r) => r.isStreaming)) return stored;
  return {
    ...stored,
    responses: stored.responses.map((r) =>
      r.isStreaming
        ? {
            ...r,
            isStreaming: false,
            isComplete: true,
            error: INTERRUPTED_ERROR_MESSAGE,
            errorKind: "interrupted" as const,
            retryAfterSeconds: null,
          }
        : r,
    ),
  };
}
