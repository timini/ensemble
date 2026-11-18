import { useMemo } from "react";
import {
  estimateRun,
  type RunEstimate,
} from "@ensemble-ai/shared-utils/pricing";
import { useStore } from "~/store";
import { buildEstimateInput } from "~/lib/runCost";
import { useEmbeddingsProvider } from "./useEmbeddingsProvider";
import type { ConsensusMethod } from "~/store/slices/ensembleSlice";

const METHODS: ConsensusMethod[] = ["standard", "majority", "elo", "council"];

/**
 * Calls and cost range of the run for every consensus method, for the
 * method menu in the composer: what each method would cost with the
 * current models, summarizer and prompt.
 */
export function useRunEstimates(
  prompt: string,
): Record<ConsensusMethod, RunEstimate> {
  const selectedModels = useStore((state) => state.selectedModels);
  const manualResponseCount = useStore((state) => state.manualResponses.length);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const eloTopN = useStore((state) => state.eloTopN);
  const embeddingsProvider = useEmbeddingsProvider();
  const endpoints = useStore((state) => state.endpoints);

  return useMemo(
    () =>
      Object.fromEntries(
        METHODS.map((consensusMethod) => [
          consensusMethod,
          estimateRun(
            buildEstimateInput({
              selectedModels,
              manualResponseCount,
              consensusMethod,
              summarizerModel,
              eloTopN,
              embeddingsProvider,
              endpoints,
              prompt,
            }),
          ),
        ]),
      ) as Record<ConsensusMethod, RunEstimate>,
    [
      selectedModels,
      manualResponseCount,
      summarizerModel,
      eloTopN,
      embeddingsProvider,
      endpoints,
      prompt,
    ],
  );
}
