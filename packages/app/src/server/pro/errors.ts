import { TRPCError } from "@trpc/server";
import { isProviderError } from "@ensemble-ai/shared-utils/providers";
import { InsufficientCreditsError } from "~/server/credits/errors";
import { ProUnavailableError, UnpricedModelError } from "./models";
import { RateLimitError } from "./rateLimit";
import { ProRunError } from "./runStore";

type Code = TRPCError["code"];

const PROVIDER_CODES: Record<string, Code> = {
  rate_limited: "TOO_MANY_REQUESTS",
  timeout: "GATEWAY_TIMEOUT",
  provider_unavailable: "BAD_GATEWAY",
  // The server key was refused: our configuration, not the user's.
  invalid_key: "BAD_GATEWAY",
  missing_key: "SERVICE_UNAVAILABLE",
  cancelled: "CLIENT_CLOSED_REQUEST",
  insufficient_credits: "PAYMENT_REQUIRED",
  other: "BAD_GATEWAY",
};

const RUN_CODES: Record<ProRunError["reason"], Code> = {
  not_found: "NOT_FOUND",
  closed: "CONFLICT",
  duplicate_call: "CONFLICT",
  budget: "FORBIDDEN",
};

/**
 * A Pro failure as a TRPCError the client can map back to an error kind
 * (see providers/pro/proErrors.ts). The original error is kept as the
 * cause, so the error formatter can pass on a retry delay.
 */
export function toProTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  const make = (code: Code, message: string) =>
    new TRPCError({ code, message, cause: error });
  if (error instanceof InsufficientCreditsError)
    return make("PAYMENT_REQUIRED", error.message);
  if (error instanceof RateLimitError)
    return make("TOO_MANY_REQUESTS", error.message);
  if (error instanceof ProRunError)
    return make(RUN_CODES[error.reason], error.message);
  if (error instanceof UnpricedModelError || error instanceof RangeError) {
    return make("BAD_REQUEST", error.message);
  }
  if (error instanceof ProUnavailableError)
    return make("SERVICE_UNAVAILABLE", error.message);
  if (isProviderError(error)) {
    return make(PROVIDER_CODES[error.kind] ?? "BAD_GATEWAY", error.message);
  }
  return make("INTERNAL_SERVER_ERROR", "The Pro request failed.");
}

/** Seconds to wait before retrying, when the error says. */
export function retryAfterOf(error: unknown): number | undefined {
  const value = (error as { retryAfterSeconds?: unknown } | null)
    ?.retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
