/**
 * Pure updates of the answers in the response slice: start (or restart) a
 * stream, add a chunk, complete it, or record its error.
 */
import type { TokenUsage } from "@ensemble-ai/shared-utils/providers";
import type { ProviderType } from "./ensembleSlice";
import type { ResponseErrorDetails } from "./responseErrorState";
import type { ModelResponse } from "./responseTypes";

/** Fields of an answer when its stream starts or restarts. */
const STREAM_START = {
  response: "",
  isStreaming: true,
  isComplete: false,
  responseTime: null,
  tokenCount: null,
  usage: null,
  error: null,
  errorKind: null,
  retryAfterSeconds: null,
} as const;

function update(
  responses: ModelResponse[],
  modelId: string,
  change: (r: ModelResponse) => Partial<ModelResponse>,
): ModelResponse[] {
  return responses.map((r) =>
    r.modelId === modelId ? { ...r, ...change(r) } : r,
  );
}

/** A new answer, and a restart (retry), start from an empty answer. */
export function withStreamStarted(
  responses: ModelResponse[],
  modelId: string,
  provider: ProviderType,
  model: string,
): ModelResponse[] {
  if (responses.some((r) => r.modelId === modelId)) {
    return update(responses, modelId, () => STREAM_START);
  }
  return [...responses, { modelId, provider, model, ...STREAM_START }];
}

export function withChunk(
  responses: ModelResponse[],
  modelId: string,
  chunk: string,
): ModelResponse[] {
  return update(responses, modelId, (r) => ({ response: r.response + chunk }));
}

export function withCompleted(
  responses: ModelResponse[],
  modelId: string,
  responseTime: number,
  tokenCount?: number,
  usage?: TokenUsage,
): ModelResponse[] {
  return update(responses, modelId, () => ({
    isStreaming: false,
    isComplete: true,
    responseTime,
    tokenCount: tokenCount ?? null,
    usage: usage ?? null,
  }));
}

export function withError(
  responses: ModelResponse[],
  modelId: string,
  error: string,
  details?: ResponseErrorDetails,
): ModelResponse[] {
  return update(responses, modelId, () => ({
    isStreaming: false,
    isComplete: true,
    error,
    errorKind: details?.kind ?? "other",
    retryAfterSeconds: details?.retryAfterSeconds ?? null,
  }));
}
