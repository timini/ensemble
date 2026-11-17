import { useMemo } from "react";
import {
  estimateRun,
  type RunEstimate,
} from "@ensemble-ai/shared-utils/pricing";
import { useStore } from "~/store";
import { buildEstimateInput } from "~/lib/runCost";
import { useEmbeddingsProvider } from "./useEmbeddingsProvider";

/**
 * Calls and cost range of the run the prompt page would start with the
 * current models, consensus method and prompt.
 */
export function useRunEstimate(prompt: string): RunEstimate {
  const selectedModels = useStore((state) => state.selectedModels);
  const manualResponses = useStore((state) => state.manualResponses);
  const consensusMethod = useStore((state) => state.consensusMethod);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const eloTopN = useStore((state) => state.eloTopN);
  const embeddingsProvider = useEmbeddingsProvider();

  return useMemo(
    () =>
      estimateRun(
        buildEstimateInput({
          selectedModels,
          manualResponseCount: manualResponses.length,
          consensusMethod,
          summarizerModel,
          eloTopN,
          embeddingsProvider,
          prompt,
        }),
      ),
    [
      selectedModels,
      manualResponses.length,
      consensusMethod,
      summarizerModel,
      eloTopN,
      embeddingsProvider,
      prompt,
    ],
  );
}
