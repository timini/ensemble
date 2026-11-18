import type { ProviderMode } from "@ensemble-ai/shared-utils/providers";
import { PRICE_TABLE } from "@ensemble-ai/shared-utils/pricing";
import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";
import type { OperatingMode } from "~/store/slices/modeSlice";
import type {
  ConsensusMethod,
  ModelSelection,
} from "~/store/slices/ensembleSlice";
import type { ProRunInput } from "~/providers/pro/ProRunSession";
import { PROVIDERS } from "./ensembleConstants";
import {
  resolveEmbeddingsProvider,
  type EmbeddingProvider,
} from "./embeddingsProvider";
import { embeddingStatuses, type EndpointLike } from "./endpointStatus";
import { buildEstimateInput } from "./runCost";

/**
 * Which registered client a call uses. Pro always uses the Pro client, so
 * Pro can be exercised in mock mode against the server's mock upstream;
 * Free uses the mock client in mock mode.
 */
export function resolveClientMode(mode: OperatingMode): ProviderMode {
  if (mode === "pro") return "pro";
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true" ? "mock" : "free";
}

/** In Pro every hosted provider is ready: the server holds the key. */
export const PRO_STATUSES: Record<Provider, ValidationStatus> =
  Object.fromEntries(PROVIDERS.map((p) => [p, "valid"])) as Record<
    Provider,
    ValidationStatus
  >;

/** True when Pro can bill the model (it has a price, hence an OpenRouter id). */
export function isProPriced(provider: string, modelId: string): boolean {
  return Boolean(PRICE_TABLE.models[`${provider}/${modelId}`]);
}

/**
 * The embeddings provider for the agreement score. In Free it follows the
 * keys and endpoints; in Pro it is OpenAI or Google through the server.
 */
export function workspaceEmbeddingsProvider(options: {
  mode: OperatingMode;
  preference: string;
  apiKeys: Readonly<Record<string, { status?: string } | null>>;
  endpoints: readonly EndpointLike[];
}): EmbeddingProvider | null {
  const statuses =
    options.mode === "pro"
      ? { openai: "valid", google: "valid" }
      : embeddingStatuses(options.apiKeys, options.endpoints);
  return resolveEmbeddingsProvider({
    preference: options.preference,
    statuses,
  });
}

export interface ProRunState {
  selectedModels: ModelSelection[];
  manualResponses: readonly unknown[];
  consensusMethod: ConsensusMethod;
  summarizerModel: string | null;
  eloTopN: number;
  embeddingsProvider: string;
}

/** The run as the Pro server prices it before reserving credits. */
export function proRunInput(state: ProRunState, prompt: string): ProRunInput {
  const input = buildEstimateInput({
    selectedModels: state.selectedModels,
    manualResponseCount: state.manualResponses.length,
    consensusMethod: state.consensusMethod,
    summarizerModel: state.summarizerModel,
    eloTopN: state.eloTopN,
    embeddingsProvider: workspaceEmbeddingsProvider({
      mode: "pro",
      preference: state.embeddingsProvider,
      apiKeys: {},
      endpoints: [],
    }),
    prompt,
  });
  return {
    models: input.models,
    manualResponseCount: input.manualResponseCount,
    consensusMethod: input.consensusMethod,
    summarizer: input.summarizer,
    eloTopN: input.eloTopN,
    embeddings: input.embeddings,
    promptTokens: input.promptTokens,
  };
}
