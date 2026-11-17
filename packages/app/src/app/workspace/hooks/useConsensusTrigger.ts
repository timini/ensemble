import { useEffect } from "react";
import type { ModelResponse, ManualResponse } from "~/store/slices/responseSlice";

/**
 * Triggers consensus generation when all model responses have completed.
 * Failed answers are left out; it waits for at least 2 successful answers
 * (model or manual) before firing. It does not fire again after a consensus
 * error, so a failing summarizer is not called in a loop; retrying a model
 * clears the error.
 */
export function useConsensusTrigger({
  hasHydrated,
  responses,
  manualResponses,
  metaAnalysis,
  summarizerModel,
  selectedModels,
  prompt,
  generateConsensus,
  isGenerating,
  error = null,
}: {
  hasHydrated: boolean;
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  metaAnalysis: string | null;
  summarizerModel: string | null;
  selectedModels: { id: string; model: string; provider: string }[];
  prompt: string | null;
  generateConsensus: (
    responses: { modelId: string; modelName: string; content: string }[],
    originalPrompt: string,
    summarizerOverride: string,
  ) => Promise<void>;
  isGenerating: boolean;
  /** Error of the last consensus attempt, if it failed. */
  error?: string | null;
}) {
  useEffect(() => {
    if (!hasHydrated || metaAnalysis || isGenerating || error) return;

    // selectedModels[].model is an API identifier (e.g., "gpt-4o"), not a display name
    const effectiveSummarizerId =
      summarizerModel ?? selectedModels[0]?.model;

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
    error,
  ]);
}
