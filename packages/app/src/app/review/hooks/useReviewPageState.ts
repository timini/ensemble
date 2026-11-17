import { useMemo } from "react";
import { useStore } from "~/store";
import { resolveEmbeddingsProvider } from "~/lib/embeddingsProvider";

/**
 * Extracts all store selectors and hydration-gated memos for the Review page.
 * Returns pre-hydration-safe values that avoid SSR/client mismatches.
 */
export function useReviewPageState(hasHydrated: boolean) {
  // The run's own prompt; runs persisted before runPrompt existed fall back
  // to the draft.
  const runPrompt = useStore((state) => state.runPrompt);
  const draftPrompt = useStore((state) => state.prompt);
  const prompt = runPrompt ?? draftPrompt;
  const summarizerModel = useStore((state) => state.summarizerModel);
  const selectedModels = useStore((state) => state.selectedModels);
  const responses = useStore((state) => state.responses);
  const agreementStats = useStore((state) => state.agreementStats);
  const metaAnalysis = useStore((state) => state.metaAnalysis);
  const majorityVote = useStore((state) => state.majorityVote);
  const manualResponses = useStore((state) => state.manualResponses);
  const embeddings = useStore((state) => state.embeddings);
  const embeddingsSource = useStore((state) => state.embeddingsSource);
  const similarityMatrix = useStore((state) => state.similarityMatrix);
  const mode = useStore((state) => state.mode);
  const embeddingsPreference = useStore((state) => state.embeddingsProvider);
  const apiKeys = useStore((state) => state.apiKeys);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const setEmbeddings = useStore((state) => state.setEmbeddings);
  const calculateAgreement = useStore((state) => state.calculateAgreement);

  // Provider used for agreement embeddings, or null when none is available.
  const embeddingsProvider = useMemo(() => {
    const statuses = Object.fromEntries(
      Object.entries(apiKeys).map(([provider, entry]) => [
        provider,
        entry?.status ?? "idle",
      ]),
    );
    return resolveEmbeddingsProvider({
      preference: embeddingsPreference,
      statuses,
      mockMode: process.env.NEXT_PUBLIC_MOCK_MODE === "true",
    });
  }, [apiKeys, embeddingsPreference]);

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

  const viewMajorityVote = hasHydrated ? majorityVote : null;

  const viewEmbeddingsSource = hasHydrated ? embeddingsSource : null;

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
    viewMajorityVote,
    viewEmbeddings,
    viewEmbeddingsSource,
    viewSimilarityMatrix,
  };
}
