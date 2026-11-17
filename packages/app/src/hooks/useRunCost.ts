import { useMemo } from "react";
import {
  computeRunCost,
  PRICE_TABLE,
  type RunCost,
} from "@ensemble-ai/shared-utils/pricing";
import { useStore, type ModelResponse } from "~/store";
import { buildRunCallUsage, endpointLocations } from "~/lib/runCost";
import { selectRunPrompt } from "~/store/slices/responseSlice";

/**
 * Cost of the current run so far: answers, consensus calls and embedding
 * calls, priced with the shared table. Endpoint models are priced from
 * their endpoint's base URL. Returns null until every answer has finished.
 */
export function useRunCost(
  responses: ModelResponse[],
  embeddings: { modelId: string }[],
  embeddingsSource: string | null,
): RunCost | null {
  const prompt = useStore(selectRunPrompt);
  const selectedModels = useStore((state) => state.selectedModels);
  const consensusUsage = useStore((state) => state.consensusUsage);
  const manualResponses = useStore((state) => state.manualResponses);
  const endpoints = useStore((state) => state.endpoints);

  return useMemo(() => {
    if (responses.length === 0 || responses.some((r) => !r.isComplete))
      return null;
    return computeRunCost(
      buildRunCallUsage({
        prompt: prompt ?? "",
        responses,
        selectedModels,
        consensusUsage,
        manualResponses,
        embeddings,
        embeddingsSource,
        endpoints,
      }),
      PRICE_TABLE,
      endpointLocations(endpoints),
    );
  }, [
    prompt,
    responses,
    selectedModels,
    consensusUsage,
    manualResponses,
    embeddings,
    embeddingsSource,
    endpoints,
  ]);
}
