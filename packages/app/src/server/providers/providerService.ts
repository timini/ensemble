import {
  createProviderClient,
  type ProviderName,
} from "@ensemble-ai/shared-utils/providers";
import { env } from "~/env";

interface StreamProviderInput {
  provider: ProviderName;
  model: string;
  prompt: string;
  temperature?: number;
}

interface StreamProviderResult {
  response: string;
  responseTimeMs: number;
  tokenCount?: number;
}

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
  return createProviderClient({
    provider,
    mode: "free",
    getApiKey: () => getProviderApiKey(provider),
  });
}

export async function listProviderTextModels(
  provider: ProviderName,
): Promise<string[]> {
  return getProviderClient(provider).listAvailableTextModels();
}

export async function streamProviderResponse(
  input: StreamProviderInput,
): Promise<StreamProviderResult> {
  const client = getProviderClient(input.provider);
  let bufferedResponse = "";

  return new Promise<StreamProviderResult>((resolve, reject) => {
    void client.streamResponse(
      input.prompt,
      input.model,
      (chunk) => {
        bufferedResponse += chunk;
      },
      (fullResponse, responseTime, tokenCount) => {
        resolve({
          response: fullResponse || bufferedResponse,
          responseTimeMs: responseTime,
          ...(tokenCount !== undefined ? { tokenCount } : {}),
        });
      },
      (error) => {
        reject(error);
      },
      ...(input.temperature !== undefined
        ? [{ temperature: input.temperature }]
        : []),
    );
  });
}
