import {
  createProviderClient,
  type ProviderName,
} from "@ensemble-ai/shared-utils/providers";
import { env } from "~/env";

/**
 * Server key for a provider. OpenAI-compatible endpoints are configured in
 * the browser only, so the server has no key for them and refuses them.
 */
function getProviderApiKey(provider: ProviderName): string | null {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY ?? null;
    case "anthropic":
      return env.ANTHROPIC_API_KEY ?? null;
    case "google":
      return env.GOOGLE_API_KEY ?? null;
    case "xai":
      return env.XAI_API_KEY ?? null;
    case "deepseek":
      return env.DEEPSEEK_API_KEY ?? null;
    case "perplexity":
      return env.PERPLEXITY_API_KEY ?? null;
    default:
      return null;
  }
}

function getProviderClient(provider: ProviderName) {
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(`Server API key not configured for provider: ${provider}`);
  }

  return createProviderClient({
    provider,
    mode: "free",
    getApiKey: () => apiKey,
  });
}

export async function listProviderTextModels(
  provider: ProviderName,
): Promise<string[]> {
  return getProviderClient(provider).listAvailableTextModels();
}
