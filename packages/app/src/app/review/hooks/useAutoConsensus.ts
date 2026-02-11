/**
 * Hook that auto-triggers consensus generation when all
 * model responses are complete.
 */

import { useEffect } from "react";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { useConsensusGeneration } from "./useConsensusGeneration";

export function useAutoConsensus() {
  const hasHydrated = useHasHydrated();

  const prompt = useStore((s) => s.prompt);
  const summarizerModel = useStore((s) => s.summarizerModel);
  const selectedModels = useStore((s) => s.selectedModels);
  const responses = useStore((s) => s.responses);
  const metaAnalysis = useStore((s) => s.metaAnalysis);
  const manualResponses = useStore((s) => s.manualResponses);

  const { generateConsensus, isGenerating } = useConsensusGeneration();

  useEffect(() => {
    if (!hasHydrated || metaAnalysis || isGenerating) return;

    let effectiveSummarizerId = summarizerModel;

    if (!effectiveSummarizerId && selectedModels[0]) {
      effectiveSummarizerId = selectedModels[0].model
        .toLowerCase()
        .replace(/\s+/g, "-");
    }

    if (!effectiveSummarizerId) return;

    const allResponsesComplete = responses.every(
      (r) => r.isComplete && !r.isStreaming,
    );
    if (!allResponsesComplete && responses.length > 0) return;

    const allCompletedResponses = [
      ...responses
        .filter((r) => r.isComplete && !r.error)
        .map((r) => ({
          modelId: r.modelId,
          modelName: r.model,
          content: r.response,
        })),
      ...manualResponses.map((r) => ({
        modelId: r.id,
        modelName: r.label,
        content: r.response ?? "",
      })),
    ].filter((r) => r.content.trim().length > 0);

    if (allCompletedResponses.length >= 2) {
      void generateConsensus(
        allCompletedResponses,
        prompt ?? "",
        effectiveSummarizerId,
      );
    }
  }, [
    hasHydrated,
    responses,
    manualResponses,
    metaAnalysis,
    summarizerModel,
    selectedModels,
    prompt,
    generateConsensus,
    isGenerating,
  ]);
}
