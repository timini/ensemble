import { useMemo } from "react";
import type { ConsensusStatus } from "@/components/organisms/ConsensusCard";
import type { ModelResponse } from "~/store/slices/responseSlice";

/**
 * Derives the consensus card display status from existing response
 * and consensus generation state. Returns null when the card should
 * be hidden (e.g. before hydration or when no responses exist).
 */
export function useConsensusStatus({
  hasHydrated,
  responses,
  metaAnalysis,
  isGenerating,
  error,
}: {
  hasHydrated: boolean;
  responses: ModelResponse[];
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

    // All responses complete but consensus hasn't started yet
    return "generating";
  }, [hasHydrated, responses, error, metaAnalysis, isGenerating]);
}
