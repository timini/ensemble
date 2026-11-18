import {
  MockProviderClient,
  ProviderRegistry,
  getEndpointPreset,
  parseEndpointModelId,
  presetIdOfEndpoint,
  toEndpointModelId,
} from "@ensemble-ai/shared-utils/providers";
import type { Model } from "@/components/organisms/ModelSelectionList";
import { initializeProviders } from "~/providers";

/** The part of an endpoint the model list needs. */
export interface EndpointLabel {
  id: string;
  label: string;
}

/**
 * Display name of an OpenAI-compatible model: its id on the server and the
 * endpoint it runs on, `llama3.2:3b (Ollama)`. Unqualified ids are returned
 * as they are.
 */
export function endpointModelName(
  qualifiedId: string,
  endpoints: readonly EndpointLabel[],
): string {
  const parsed = parseEndpointModelId(qualifiedId);
  if (!parsed) return qualifiedId;
  const label =
    endpoints.find((e) => e.id === parsed.endpointId)?.label ??
    getEndpointPreset(presetIdOfEndpoint(parsed.endpointId)).label;
  return `${parsed.modelId} (${label})`;
}

function toModel(
  qualifiedId: string,
  endpoints: readonly EndpointLabel[],
): Model {
  return {
    id: qualifiedId,
    name: endpointModelName(qualifiedId, endpoints),
    provider: "openai-compatible",
    modalities: ["text"],
  };
}

/**
 * Models of the connected OpenAI-compatible endpoints, read live from each
 * server's `GET /models` through the registered `openai-compatible` client.
 * In mock mode every endpoint offers the mock client's models under its own
 * id, so mock runs exercise the same id handling.
 */
export async function fetchEndpointModels(
  endpoints: readonly EndpointLabel[],
): Promise<Model[]> {
  if (endpoints.length === 0) return [];

  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    const bareIds = new MockProviderClient({
      providerFilter: "openai-compatible",
    })
      .listAvailableModels()
      .map((m) => parseEndpointModelId(m.id)?.modelId ?? m.id);
    return endpoints.flatMap((endpoint) =>
      bareIds.map((id) =>
        toModel(toEndpointModelId(endpoint.id, id), endpoints),
      ),
    );
  }

  initializeProviders();
  const client = ProviderRegistry.getInstance().getProvider(
    "openai-compatible",
    "free",
  );
  const ids = await client.listAvailableTextModels();
  return ids.map((id) => toModel(id, endpoints));
}
