import {
  FreeOpenAICompatibleClient,
  MockProviderClient,
  modelListIncludes,
  redactSensitiveData,
  type OpenAICompatibleEndpointConfig,
} from "@ensemble-ai/shared-utils/providers";
import type { EndpointErrorCode } from "@/components/molecules/EndpointInput";

export interface EndpointCheckResult {
  status: "valid" | "invalid";
  /** The server's error message, with secrets redacted. */
  error?: string;
  /** A failure with no server message, translated by the UI. */
  errorCode?: EndpointErrorCode;
  /** Models the endpoint listed. */
  modelCount?: number;
  /** True when the embedding model is in the endpoint's model list. */
  embeddingModelFound?: boolean;
}

const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_MODE === "true";

/**
 * Check an OpenAI-compatible endpoint with `GET {baseURL}/models`, count its
 * models and look for its embedding model in the list. The key may be
 * empty. In mock mode no request is sent: every endpoint with a base URL
 * connects, offers the mock models and can embed.
 */
export async function checkEndpoint(
  endpoint: OpenAICompatibleEndpointConfig,
  fetchImpl?: typeof fetch,
): Promise<EndpointCheckResult> {
  if (!endpoint.baseURL.trim()) {
    return { status: "invalid", errorCode: "baseUrlRequired" };
  }

  if (isMockMode()) {
    const models = new MockProviderClient({
      providerFilter: "openai-compatible",
    }).listAvailableModels();
    return { status: "valid", modelCount: models.length, embeddingModelFound: true };
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
    return {
      status: "valid",
      modelCount: models.length,
      embeddingModelFound: modelListIncludes(models, endpoint.embeddingModel ?? ""),
    };
  } catch (error: unknown) {
    const message = redactSensitiveData(
      error instanceof Error ? error.message : String(error),
    ).trim();
    return message
      ? { status: "invalid", error: message }
      : { status: "invalid", errorCode: "unreachable" };
  }
}
