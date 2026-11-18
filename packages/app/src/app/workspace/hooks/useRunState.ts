import { useMemo } from "react";
import { useStore } from "~/store";
import { selectRunModels, selectRunPrompt } from "~/store/slices/responseSlice";
import { workspaceEmbeddingsProvider } from "~/lib/proMode";

/**
 * Store selectors and hydration-gated memos for the run on the workspace.
 * Returns pre-hydration-safe values that avoid SSR/client mismatches.
 */
export function useRunState(hasHydrated: boolean) {
  // The submitted run's prompt, or null when there is no run (see
  // selectRunPrompt). Never the unsubmitted draft.
  const prompt = useStore(selectRunPrompt);
  const summarizerModel = useStore((state) => state.summarizerModel);
  // Models of the run on screen, not the ensemble being edited for the next one.
  const selectedModels = useStore(selectRunModels);
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
  const endpoints = useStore((state) => state.endpoints);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const setEmbeddings = useStore((state) => state.setEmbeddings);
  const calculateAgreement = useStore((state) => state.calculateAgreement);

  // Provider used for agreement embeddings, or null when none is available.
  const embeddingsProvider = useMemo(
    () =>
      workspaceEmbeddingsProvider({
        mode,
        preference: embeddingsPreference,
        apiKeys,
        endpoints,
      }),
    [mode, apiKeys, endpoints, embeddingsPreference],
  );

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
