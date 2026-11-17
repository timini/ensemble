import { toEndpointModelId } from "@ensemble-ai/shared-utils/providers";
import type { ModelRef } from "@ensemble-ai/shared-utils/pricing";
import type { ValidationStatus } from "@/components/molecules/ApiKeyInput";
import type { EndpointEntry } from "~/store/slices/endpointsSlice";

export type EndpointLike = Pick<
  EndpointEntry,
  "id" | "status" | "embeddingModel" | "embeddingModelFound"
>;

/**
 * One status for the `openai-compatible` provider from all its endpoints:
 * valid when any endpoint is connected, else validating, else invalid,
 * else idle.
 */
export function endpointsProviderStatus(
  endpoints: readonly EndpointLike[],
): ValidationStatus {
  for (const status of ["valid", "validating", "invalid"] as const) {
    if (endpoints.some((endpoint) => endpoint.status === status)) return status;
  }
  return "idle";
}

/**
 * The endpoint used for embeddings: the first connected one whose embedding
 * model the check found on the server. This matches
 * OpenAICompatibleEndpointsClient, which only sees connected endpoints and
 * only their found embedding models (selectEndpointConfigs).
 */
export function embeddingsEndpoint(
  endpoints: readonly EndpointLike[],
): EndpointLike | undefined {
  return endpoints.find(
    (endpoint) =>
      endpoint.status === "valid" &&
      endpoint.embeddingModelFound === true &&
      endpoint.embeddingModel.trim() !== "",
  );
}

/** True when a connected endpoint has an embedding model the server lists. */
export function canEmbedWithEndpoints(
  endpoints: readonly EndpointLike[],
): boolean {
  return embeddingsEndpoint(endpoints) !== undefined;
}

/**
 * Statuses for embeddings provider selection: each key provider's status,
 * plus `openai-compatible`, valid only when an endpoint can embed.
 */
export function embeddingStatuses(
  apiKeys: Readonly<Record<string, { status?: string } | null>>,
  endpoints: readonly EndpointLike[],
): Record<string, string> {
  const statuses: Record<string, string> = Object.fromEntries(
    Object.entries(apiKeys).map(([provider, entry]) => [
      provider,
      entry?.status ?? "idle",
    ]),
  );
  statuses["openai-compatible"] = canEmbedWithEndpoints(endpoints)
    ? "valid"
    : "idle";
  return statuses;
}

/** The endpoint embedding model as a priced model ref, or null when there is none. */
export function endpointEmbeddingModelRef(
  endpoints: readonly EndpointLike[],
): ModelRef | null {
  const endpoint = embeddingsEndpoint(endpoints);
  if (!endpoint) return null;
  return {
    provider: "openai-compatible",
    modelId: toEndpointModelId(endpoint.id, endpoint.embeddingModel.trim()),
  };
}
