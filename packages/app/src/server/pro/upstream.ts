import {
  FreeOpenAICompatibleClient,
  MockProviderClient,
  type AIProvider,
} from "@ensemble-ai/shared-utils/providers";
import type { ProConfig } from "./config";
import { ProUnavailableError } from "./models";

export interface Upstream {
  /** Takes OpenRouter model ids. */
  client: AIProvider;
  /** True for the mock client: usage is estimated from text, nothing is spent. */
  mock: boolean;
}

export interface UpstreamOptions {
  /** OpenRouter id of the embedding model, for an embeddings call. */
  embeddingModel?: string;
  /** Injected fetch, for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * The client Pro calls go through: the shared OpenAI-compatible client
 * pointed at OpenRouter with the server key (Decision 6), or the mock client
 * when the mock upstream is on. Throws ProUnavailableError without a key.
 */
export function createUpstream(
  config: ProConfig,
  options: UpstreamOptions = {},
): Upstream {
  if (config.mockUpstream) {
    return { client: new MockProviderClient(), mock: true };
  }
  const key = config.openRouterApiKey;
  if (!key) throw new ProUnavailableError();
  const client = new FreeOpenAICompatibleClient(
    "openai-compatible",
    () => key,
    {
      getBaseURL: () => config.openRouterBaseURL,
      getEmbeddingModel: () => options.embeddingModel,
      fetchImpl: options.fetchImpl,
    },
  );
  return { client, mock: false };
}
