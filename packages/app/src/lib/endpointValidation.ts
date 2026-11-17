import {
  FreeOpenAICompatibleClient,
  MockProviderClient,
  sanitizeProviderErrorMessage,
  type OpenAICompatibleEndpointConfig,
} from "@ensemble-ai/shared-utils/providers";

export interface EndpointCheckResult {
  status: "valid" | "invalid";
  error?: string;
  /** Models the endpoint listed. */
  modelCount?: number;
}

const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_MODE === "true";

/**
 * Check an OpenAI-compatible endpoint with `GET {baseURL}/models` and count
 * its models. The key may be empty. In mock mode no request is sent: every
 * endpoint with a base URL connects and offers the mock models.
 */
export async function checkEndpoint(
  endpoint: OpenAICompatibleEndpointConfig,
  fetchImpl?: typeof fetch,
): Promise<EndpointCheckResult> {
  if (!endpoint.baseURL.trim()) {
    return { status: "invalid", error: "Base URL is required." };
  }

  if (isMockMode()) {
    const models = new MockProviderClient({
      providerFilter: "openai-compatible",
    }).listAvailableModels();
    return { status: "valid", modelCount: models.length };
  }

  const client = new FreeOpenAICompatibleClient(
    "openai-compatible",
    () => endpoint.apiKey,
    {
      getBaseURL: () => endpoint.baseURL,
      fetchImpl,
    },
  );
  try {
    const models = await client.listModels(endpoint.apiKey);
    return { status: "valid", modelCount: models.length };
  } catch (error: unknown) {
    return {
      status: "invalid",
      error: sanitizeProviderErrorMessage(
        error instanceof Error ? error.message : String(error),
        "Could not reach the endpoint.",
      ),
    };
  }
}
