/**
 * Hook that aggregates all store state for the review page,
 * gating values behind hydration to prevent SSR/CSR mismatches.
 */

import { useMemo } from "react";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from "~/lib/agreement";

export function useReviewPageState() {
  const hasHydrated = useHasHydrated();

  const prompt = useStore((s) => s.prompt);
  const summarizerModel = useStore((s) => s.summarizerModel);
  const selectedModels = useStore((s) => s.selectedModels);
  const responses = useStore((s) => s.responses);
  const agreementStats = useStore((s) => s.agreementStats);
  const metaAnalysis = useStore((s) => s.metaAnalysis);
  const manualResponses = useStore((s) => s.manualResponses);
  const embeddings = useStore((s) => s.embeddings);
  const similarityMatrix = useStore((s) => s.similarityMatrix);
  const mode = useStore((s) => s.mode);
  const embeddingsProvider = useStore((s) => s.embeddingsProvider);

  const setCurrentStep = useStore((s) => s.setCurrentStep);
  const clearResponses = useStore((s) => s.clearResponses);
  const resetStreamingState = useStore((s) => s.resetStreamingState);
  const setEmbeddings = useStore((s) => s.setEmbeddings);
  const calculateAgreement = useStore((s) => s.calculateAgreement);

  // Hydration-guarded values
  const viewResponses = useMemo(
    () => (hasHydrated ? responses : []),
    [hasHydrated, responses],
  );
  const viewManualResponses = useMemo(
    () => (hasHydrated ? manualResponses : []),
    [hasHydrated, manualResponses],
  );
  const viewAgreementStats = useMemo(
    () => (hasHydrated ? agreementStats : null),
    [agreementStats, hasHydrated],
  );
  const viewMetaAnalysis = useMemo(
    () => (hasHydrated ? metaAnalysis : null),
    [hasHydrated, metaAnalysis],
  );
  const viewEmbeddings = useMemo(
    () => (hasHydrated ? embeddings : []),
    [embeddings, hasHydrated],
  );
  const viewSimilarityMatrix = useMemo(
    () => (hasHydrated ? similarityMatrix : null),
    [hasHydrated, similarityMatrix],
  );

  // Derived data
  const completedResponses = useMemo(
    () =>
      viewResponses.filter(
        (r) => r.isComplete && !r.error && r.response.trim().length > 0,
      ),
    [viewResponses],
  );
  const pairwiseComparisons = useMemo(
    () => buildPairwiseComparisons(completedResponses, viewSimilarityMatrix),
    [completedResponses, viewSimilarityMatrix],
  );
  const overallAgreement = useMemo(
    () =>
      viewAgreementStats ? normalizeSimilarity(viewAgreementStats.mean) : 0,
    [viewAgreementStats],
  );
  const averageConfidence = useMemo(
    () => calculateAverageConfidence(pairwiseComparisons),
    [pairwiseComparisons],
  );
  const displayPrompt = hasHydrated ? (prompt ?? "") : "";

  return {
    hasHydrated,
    prompt,
    summarizerModel,
    selectedModels,
    mode,
    embeddingsProvider,
    metaAnalysis,

    viewResponses,
    viewManualResponses,
    viewAgreementStats,
    viewMetaAnalysis,
    viewEmbeddings,
    viewSimilarityMatrix,

    completedResponses,
    pairwiseComparisons,
    overallAgreement,
    averageConfidence,
    displayPrompt,

    setCurrentStep,
    clearResponses,
    resetStreamingState,
    setEmbeddings,
    calculateAgreement,
  };
}
