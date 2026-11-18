/**
 * Glue between the store and the shared pricing code: builds the input of
 * the pre-run estimate and the list of calls priced after a run.
 */
import {
  GOOGLE_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_MODEL,
} from "@ensemble-ai/shared-utils/providers";
import {
  estimateTokensFromText,
  usageFromText,
  type CallUsage,
  type EndpointLocation,
  type EstimateRunInput,
  type ModelRef,
} from "@ensemble-ai/shared-utils/pricing";
import type { ModelResponse } from "~/store";
import type {
  ConsensusMethod,
  ModelSelection,
} from "~/store/slices/ensembleSlice";
import { FALLBACK_MODELS } from "~/lib/models";
import {
  endpointEmbeddingModelRef,
  type EndpointLike,
} from "~/lib/endpointStatus";

/** An endpoint as pricing needs it: its embedding model and its base URL. */
type PricedEndpoint = EndpointLike & { baseURL: string };

/** The id and base URL of each endpoint, which decide how its models are priced. */
export function endpointLocations(
  endpoints: readonly Pick<PricedEndpoint, "id" | "baseURL">[] = [],
): EndpointLocation[] {
  return endpoints.map(({ id, baseURL }) => ({ id, baseURL }));
}

const EMBEDDING_MODELS: Record<string, string> = {
  openai: OPENAI_EMBEDDING_MODEL,
  google: GOOGLE_EMBEDDING_MODEL,
};

/**
 * The embedding model the client calls for a provider, or null for none.
 * For `openai-compatible` it is the embedding model of the endpoint the
 * client uses, qualified with the endpoint id so local ones price at zero.
 */
export function embeddingModelRef(
  provider: string | null,
  endpoints: readonly EndpointLike[] = [],
): ModelRef | null {
  if (provider === "openai-compatible")
    return endpointEmbeddingModelRef(endpoints);
  const modelId = provider ? EMBEDDING_MODELS[provider] : undefined;
  return provider && modelId ? { provider, modelId } : null;
}

/**
 * The embedding model of a provider as one `provider/model` key, or null
 * for none. Embeddings from different keys cannot be compared.
 */
export function embeddingModelKey(
  provider: string | null,
  endpoints: readonly EndpointLike[] = [],
): string | null {
  const ref = embeddingModelRef(provider, endpoints);
  return ref ? `${ref.provider}/${ref.modelId}` : null;
}

function summarizerRef(
  summarizerModel: string | null,
  selectedModels: ModelSelection[],
): ModelRef | null {
  if (!summarizerModel) return null;
  const provider =
    selectedModels.find((m) => m.model === summarizerModel)?.provider ??
    FALLBACK_MODELS.find((m) => m.id === summarizerModel)?.provider;
  return provider ? { provider, modelId: summarizerModel } : null;
}

export interface BuildEstimateInputOptions {
  selectedModels: ModelSelection[];
  manualResponseCount: number;
  consensusMethod: ConsensusMethod;
  summarizerModel: string | null;
  eloTopN: number;
  embeddingsProvider: string | null;
  /** OpenAI-compatible endpoints, to name their embedding model and price their models. */
  endpoints?: readonly PricedEndpoint[];
  prompt: string;
}

/** Input for estimateRun from the current ensemble settings and prompt. */
export function buildEstimateInput(
  options: BuildEstimateInputOptions,
): EstimateRunInput {
  return {
    models: options.selectedModels.map((m) => ({
      provider: m.provider,
      modelId: m.model,
    })),
    manualResponseCount: options.manualResponseCount,
    consensusMethod: options.consensusMethod,
    summarizer: summarizerRef(options.summarizerModel, options.selectedModels),
    eloTopN: options.eloTopN,
    embeddings: embeddingModelRef(
      options.embeddingsProvider,
      options.endpoints,
    ),
    promptTokens: estimateTokensFromText(options.prompt),
    endpoints: endpointLocations(options.endpoints),
  };
}

export interface BuildRunCallUsageOptions {
  prompt: string;
  responses: ModelResponse[];
  selectedModels: ModelSelection[];
  consensusUsage: CallUsage[];
  /** Manual answers; only their embeddings are billed. */
  manualResponses?: { id: string; response: string }[];
  /** Answers that have an embedding. */
  embeddings: { modelId: string }[];
  /** Provider that produced the embeddings. */
  embeddingsSource: string | null;
  /** OpenAI-compatible endpoints, to name their embedding model. */
  endpoints?: readonly EndpointLike[];
}

/**
 * Every call of a finished run with its tokens: the answers (reported usage,
 * or estimated from text length), the consensus calls and the embedding
 * calls. Embedding APIs report usage but the clients do not return it, so
 * embedding calls are always estimated.
 */
export function buildRunCallUsage(
  options: BuildRunCallUsageOptions,
): CallUsage[] {
  const { prompt, responses, selectedModels } = options;
  const calls: CallUsage[] = [];

  for (const response of responses) {
    if (!response.isComplete || response.error) continue;
    const modelId =
      selectedModels.find((m) => m.id === response.modelId)?.model ??
      response.model;
    const reported = response.usage;
    calls.push({
      provider: response.provider,
      modelId,
      ...(reported ?? usageFromText(prompt, response.response)),
      source: reported ? "reported" : "estimated",
    });
  }

  calls.push(...options.consensusUsage);

  const embeddingModel = embeddingModelRef(
    options.embeddingsSource,
    options.endpoints,
  );
  if (embeddingModel) {
    for (const { modelId } of options.embeddings) {
      const text =
        responses.find((r) => r.modelId === modelId)?.response ??
        options.manualResponses?.find((m) => m.id === modelId)?.response ??
        "";
      calls.push({
        ...embeddingModel,
        inputTokens: estimateTokensFromText(text),
        outputTokens: 0,
        source: "estimated",
      });
    }
  }

  return calls;
}
