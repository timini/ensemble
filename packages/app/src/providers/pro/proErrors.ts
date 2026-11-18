import {
  ProviderError,
  classifyProviderError,
  isProviderError,
  type ProviderErrorKind,
  type ProviderName,
} from "@ensemble-ai/shared-utils/providers";

/** tRPC error codes the Pro server sends, as provider error kinds. */
const KINDS: Record<string, ProviderErrorKind> = {
  PAYMENT_REQUIRED: "insufficient_credits",
  TOO_MANY_REQUESTS: "rate_limited",
  GATEWAY_TIMEOUT: "timeout",
  TIMEOUT: "timeout",
  BAD_GATEWAY: "provider_unavailable",
  SERVICE_UNAVAILABLE: "provider_unavailable",
  INTERNAL_SERVER_ERROR: "provider_unavailable",
  CLIENT_CLOSED_REQUEST: "cancelled",
};

interface TrpcErrorLike {
  message?: unknown;
  data?: { code?: unknown; retryAfterSeconds?: unknown } | null;
}

/**
 * Turn what a Pro call failed with (a tRPC client error, an abort, a
 * network failure) into a ProviderError the answer cards understand. A
 * missing sign-in is reported as `other` with its own message, since the
 * key kinds talk about provider keys.
 */
export function toProError(
  error: unknown,
  provider?: ProviderName,
): ProviderError {
  if (isProviderError(error)) return error;
  const data = (error as TrpcErrorLike | null)?.data;
  const code = typeof data?.code === "string" ? data.code : undefined;
  if (!code) return classifyProviderError(error, { provider });
  const raw = (error as TrpcErrorLike).message;
  const message = typeof raw === "string" && raw ? raw : code;
  if (code === "UNAUTHORIZED") {
    return new ProviderError("Sign in again to use Pro.", "other", {
      provider,
      cause: error,
    });
  }
  const retry = data?.retryAfterSeconds;
  return new ProviderError(message, KINDS[code] ?? "other", {
    provider,
    cause: error,
    ...(typeof retry === "number" ? { retryAfterSeconds: retry } : {}),
  });
}
