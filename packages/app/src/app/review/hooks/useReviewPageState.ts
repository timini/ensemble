import { useMemo } from "react";
import { useStore } from "~/store";

/**
 * Extracts all store selectors and hydration-gated memos for the Review page.
 * Returns pre-hydration-safe values that avoid SSR/client mismatches.
 */
export function useReviewPageState(hasHydrated: boolean) {
  const prompt = useStore((state) => state.prompt);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const selectedModels = useStore((state) => state.selectedModels);
  const responses = useStore((state) => state.responses);
  const agreementStats = useStore((state) => state.agreementStats);
  const metaAnalysis = useStore((state) => state.metaAnalysis);
  const manualResponses = useStore((state) => state.manualResponses);
  const embeddings = useStore((state) => state.embeddings);
  const similarityMatrix = useStore((state) => state.similarityMatrix);
  const mode = useStore((state) => state.mode);
  const embeddingsProvider = useStore((state) => state.embeddingsProvider);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const setEmbeddings = useStore((state) => state.setEmbeddings);
  const calculateAgreement = useStore((state) => state.calculateAgreement);

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

  return {
    prompt,
    summarizerModel,
    selectedModels,
    metaAnalysis,
    mode,
    embeddingsProvider,
    setCurrentStep,
    resetStreamingState,
    setEmbeddings,
    calculateAgreement,
    viewResponses,
    viewManualResponses,
    viewAgreementStats,
    viewMetaAnalysis,
    viewEmbeddings,
    viewSimilarityMatrix,
  };
}
