import { classifyProviderError } from "@ensemble-ai/shared-utils/providers";
import type { ResponseErrorDetails } from "~/store/slices/responseErrorState";

export interface ResponseError {
  /** Sanitized message, stored as the answer's error and shown as detail. */
  message: string;
  details: ResponseErrorDetails;
}

/**
 * Turns whatever a stream reported or threw into the message and kind the
 * response slice stores. Provider clients already pass a ProviderError; any
 * other error is classified from its status or message.
 */
export function toResponseError(error: unknown): ResponseError {
  const classified = classifyProviderError(error);
  return {
    message: classified.message,
    details: {
      kind: classified.kind,
      retryAfterSeconds: classified.retryAfterSeconds ?? null,
    },
  };
}
