import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { FALLBACK_MODELS } from "~/lib/models";
import { formatModelLabelFromId } from "~/lib/providerModels";
import { useReviewPageState } from "./useReviewPageState";
import { useReviewAnalytics } from "./useReviewAnalytics";
import { useResponseEmbeddings } from "./useResponseEmbeddings";
import { useStreamingResponses } from "./useStreamingResponses";
import { useConsensusGeneration } from "./useConsensusGeneration";
import { useConsensusStatus } from "./useConsensusStatus";
import { useConsensusTrigger } from "./useConsensusTrigger";

/**
 * Orchestrates all review page hooks and returns only the values the JSX needs.
 * Composes state, analytics, streaming, embeddings, and consensus hooks internally.
 */
export function useReviewOrchestration() {
  const { t } = useTranslation();
  const hasHydrated = useHasHydrated();

  const {
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
  } = useReviewPageState(hasHydrated);

  const { completedResponses, pairwiseComparisons, overallAgreement, averageConfidence } =
    useReviewAnalytics(viewResponses, viewAgreementStats, viewSimilarityMatrix);

  const { retryModel } = useStreamingResponses({ hasHydrated, prompt, mode });

  useResponseEmbeddings({
    hasHydrated,
    completedResponses,
    embeddingsProvider,
    viewEmbeddings,
    viewSimilarityMatrix,
    mode,
    setEmbeddings,
    calculateAgreementState: calculateAgreement,
  });

  const {
    generateConsensus,
    isGenerating: isGeneratingConsensus,
    error: consensusError,
  } = useConsensusGeneration();

  useConsensusTrigger({
    hasHydrated,
    responses: viewResponses,
    manualResponses: viewManualResponses,
    metaAnalysis,
    summarizerModel,
    selectedModels,
    prompt,
    generateConsensus,
    isGenerating: isGeneratingConsensus,
  });

  const summarizerDisplayName = useMemo(() => {
    const modelId = summarizerModel ?? selectedModels[0]?.model;
    if (!modelId) return t("pages.review.defaultSummarizerLabel");
    const modelDef = FALLBACK_MODELS.find((m) => m.id === modelId);
    return modelDef ? modelDef.name : formatModelLabelFromId(modelId);
  }, [summarizerModel, selectedModels, t]);

  const consensusStatus = useConsensusStatus({
    hasHydrated,
    responses: viewResponses,
    metaAnalysis: viewMetaAnalysis,
    isGenerating: isGeneratingConsensus,
    error: consensusError,
  });

  const displayPrompt = hasHydrated ? (prompt ?? "") : "";

  return {
    displayPrompt,
    consensusStatus,
    summarizerDisplayName,
    viewMetaAnalysis,
    consensusError,
    completedResponses,
    pairwiseComparisons,
    overallAgreement,
    averageConfidence,
    viewResponses,
    viewManualResponses,
    retryModel,
    setCurrentStep,
    resetStreamingState,
  };
}
