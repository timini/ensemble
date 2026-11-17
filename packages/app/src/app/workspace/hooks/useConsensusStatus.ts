import { useMemo } from "react";
import type { ConsensusStatus } from "@/components/organisms/ConsensusCard";
import type { ModelResponse } from "~/store/slices/responseSlice";

/**
 * Derives the consensus card display status from existing response
 * and consensus generation state. Returns null when the card should
 * be hidden: before hydration, when no responses exist, or when every
 * answer has finished and fewer than 2 succeeded (RunExclusionNote then
 * explains why there is no consensus).
 */
export function useConsensusStatus({
  hasHydrated,
  responses,
  manualCount = 0,
  metaAnalysis,
  isGenerating,
  error,
}: {
  hasHydrated: boolean;
  responses: ModelResponse[];
  /** Manual answers, which count towards the 2-answer minimum. */
  manualCount?: number;
  metaAnalysis: string | null;
  isGenerating: boolean;
  error: string | null;
}): ConsensusStatus | null {
  return useMemo(() => {
    if (!hasHydrated || responses.length === 0) return null;

    if (error) return "failed";
    if (metaAnalysis) return "success";
    if (isGenerating) return "generating";

    const allComplete = responses.every(
      (r) => r.isComplete && !r.isStreaming,
    );
    if (!allComplete) return "awaiting";

    const succeeded = responses.filter(
      (r) => !r.error && r.response.trim().length > 0,
    ).length;
    if (succeeded + manualCount < 2) return null;

    // All responses complete but consensus hasn't started yet
    return "generating";
  }, [hasHydrated, responses, manualCount, error, metaAnalysis, isGenerating]);
}
