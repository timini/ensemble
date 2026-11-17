import {
  FreeOpenAICompatibleClient,
  MockProviderClient,
  OpenAICompatibleHttpError,
  isLocalNetworkBlockLikely,
  modelListIncludes,
  pickEmbeddingModel,
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
  /**
   * An embedding model the server has, offered when the set one is not in
   * its list (for example embeddinggemma when nomic-embed-text was never
   * pulled).
   */
  suggestedEmbeddingModel?: string;
}

export interface CheckEndpointOptions {
  /** Origin of the page making the call. Defaults to window.location.origin. */
  pageOrigin?: string;
}

const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_MODE === "true";

function currentOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/**
 * True when the request never got an HTTP answer: fetch rejects with a
 * TypeError when the server is down, CORS fails, or the browser blocks the
 * call (mixed content, local network permission).
 */
function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError && !(error instanceof OpenAICompatibleHttpError)
  );
}

/**
 * Check an OpenAI-compatible endpoint with `GET {baseURL}/models`, count its
 * models and look for its embedding model in the list. The key may be
 * empty. A failed request with no HTTP answer is `unreachable`, or
 * `localBlocked` when a page that is not on this machine called a server
 * that is, since browsers can block those calls (docs/LOCAL_MODELS.md). In mock mode no request is sent: every endpoint with a base URL
 * connects, offers the mock models and can embed, unless its key contains
 * `invalid` (as with the mock client's key check).
 */
export async function checkEndpoint(
  endpoint: OpenAICompatibleEndpointConfig,
  fetchImpl?: typeof fetch,
  options: CheckEndpointOptions = {},
): Promise<EndpointCheckResult> {
  if (!endpoint.baseURL.trim()) {
    return { status: "invalid", errorCode: "baseUrlRequired" };
  }

  if (isMockMode()) {
    if (/invalid/i.test(endpoint.apiKey ?? "")) {
      return { status: "invalid", error: "Invalid API key (401 Unauthorized)" };
    }
    const models = new MockProviderClient({
      providerFilter: "openai-compatible",
    }).listAvailableModels();
    return {
      status: "valid",
      modelCount: models.length,
      embeddingModelFound: true,
    };
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
    const embeddingModelFound = modelListIncludes(
      models,
      endpoint.embeddingModel ?? "",
    );
    const suggested = embeddingModelFound
      ? undefined
      : pickEmbeddingModel(models);
    return {
      status: "valid",
      modelCount: models.length,
      embeddingModelFound,
      ...(suggested ? { suggestedEmbeddingModel: suggested } : {}),
    };
  } catch (error: unknown) {
    if (isNetworkFailure(error)) {
      const origin = options.pageOrigin ?? currentOrigin();
      return {
        status: "invalid",
        errorCode: isLocalNetworkBlockLikely(endpoint.baseURL, origin)
          ? "localBlocked"
          : "unreachable",
      };
    }
    const message = redactSensitiveData(
      error instanceof Error ? error.message : String(error),
    ).trim();
    return message
      ? { status: "invalid", error: message }
      : { status: "invalid", errorCode: "unreachable" };
  }
}
