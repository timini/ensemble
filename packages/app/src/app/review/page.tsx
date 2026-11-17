/** Review Page — Step 4: Review streaming responses, agreement analysis, and consensus */

"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { useStepNavigation } from "~/hooks/useStepNavigation";
import { FALLBACK_MODELS } from "~/lib/models";
import { formatModelLabelFromId } from "~/lib/providerModels";
import { PageHero } from "@/components/organisms/PageHero";
import { ConsensusCard } from "@/components/organisms/ConsensusCard";
import { ProgressSteps } from "@/components/molecules/ProgressSteps";
import { Button } from "@/components/atoms/Button";
import { WorkflowNavigator } from "@/components/organisms/WorkflowNavigator";
import { PromptCard } from "@/components/organisms/PromptCard";
import { useReviewPageState } from "./hooks/useReviewPageState";
import { useReviewAnalytics } from "./hooks/useReviewAnalytics";
import { useResponseEmbeddings } from "./hooks/useResponseEmbeddings";
import { useStreamingResponses } from "./hooks/useStreamingResponses";
import { useConsensusGeneration } from "./hooks/useConsensusGeneration";
import { useConsensusStatus } from "./hooks/useConsensusStatus";
import { useConsensusTrigger } from "./hooks/useConsensusTrigger";
import { ResponsesSection } from "./_components/ResponsesSection";
import { AgreementSection } from "./_components/AgreementSection";
import { RunExclusionNote } from "./_components/RunExclusionNote";
import { useModelRetry } from "./hooks/useModelRetry";
import { useAddManualAnswer } from "./hooks/useAddManualAnswer";
import { useReviewNavigation } from "./hooks/useReviewNavigation";
import { RunCostSummary } from "@/components/molecules/RunCostSummary";
import { MajorityVoteBreakdown } from "@/components/molecules/MajorityVoteBreakdown";
import { toMajorityVoteBreakdownProps } from "~/lib/majorityVote";
import { PRICE_TABLE_DATE } from "@ensemble-ai/shared-utils/pricing";
import { useRunCost } from "~/hooks/useRunCost";

const MAX_EXPANDED_CARDS = 3;

export default function ReviewPage() {
  const { t } = useTranslation();
  const hasHydrated = useHasHydrated();
  const handleProgressStepClick = useStepNavigation();

  const {
    prompt,
    summarizerModel,
    selectedModels,
    metaAnalysis,
    mode,
    embeddingsProvider,
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
  } = useReviewPageState(hasHydrated);

  const {
    completedResponses,
    agreementAnswers,
    pairwiseComparisons,
    overallAgreement,
    averageConfidence,
    failedModels,
    allFinished,
  } = useReviewAnalytics(
    viewResponses,
    viewManualResponses,
    viewAgreementStats,
    viewSimilarityMatrix,
    viewEmbeddings,
  );

  const { retryModel } = useStreamingResponses({ hasHydrated, prompt, mode });

  const { status: embeddingsStatus, excludedModels } = useResponseEmbeddings({
    hasHydrated,
    completedResponses: agreementAnswers,
    embeddingsProvider,
    viewEmbeddings,
    viewEmbeddingsSource,
    viewSimilarityMatrix,
    mode,
    setEmbeddings,
    calculateAgreementState: calculateAgreement,
  });

  const {
    generateConsensus,
    isGenerating: isGeneratingConsensus,
    error: consensusError,
    restart: restartConsensus,
  } = useConsensusGeneration();
  const handleRetry = useModelRetry(retryModel, restartConsensus);
  const handleAddManualAnswer = useAddManualAnswer(restartConsensus);

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
    error: consensusError,
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
    manualCount: viewManualResponses.length,
    metaAnalysis: viewMetaAnalysis,
    isGenerating: isGeneratingConsensus,
    error: consensusError,
  });

  const { handleBack, handleNewComparison, handleStartOver } =
    useReviewNavigation();

  const pendingModels = useMemo(() => {
    if (!hasHydrated) return [];
    const respondedIds = new Set(viewResponses.map((r) => r.modelId));
    return selectedModels.filter((m) => !respondedIds.has(m.id));
  }, [hasHydrated, selectedModels, viewResponses]);

  const displayPrompt = hasHydrated ? (prompt ?? "") : "";

  const runCost = useRunCost(
    viewResponses,
    viewEmbeddings,
    viewEmbeddingsSource,
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps
        currentStep="review"
        fallbackStep="review"
        onStepClick={handleProgressStepClick}
      />

      <PageHero
        title={t("pages.review.title")}
        description={t("pages.review.description")}
      />

      {/* 1. Prompt Card (matches wireframe order) */}
      <div className="mt-8">
        <PromptCard prompt={displayPrompt} />
      </div>

      {/* Failed models: what consensus and agreement leave out, or why there is no consensus */}
      <RunExclusionNote
        succeeded={completedResponses.length}
        total={viewResponses.length}
        failedModels={failedModels}
        manualCount={viewManualResponses.length}
        finished={allFinished}
        agreementAvailable={embeddingsStatus !== "unavailable"}
      />

      {/* 2. Consensus Section (matches wireframe order) */}
      {consensusStatus !== null && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={summarizerDisplayName}
            consensusText={viewMetaAnalysis ?? undefined}
            status={consensusStatus}
            error={consensusError ?? undefined}
          />
          {/* Majority runs: the vote on short answers behind the consensus */}
          {viewMajorityVote && consensusStatus === "success" && (
            <MajorityVoteBreakdown
              className="mt-4"
              {...toMajorityVoteBreakdownProps(viewMajorityVote)}
            />
          )}
        </div>
      )}

      {/* 3. Agreement Analysis Section (matches wireframe order) */}
      <AgreementSection
        status={embeddingsStatus}
        overallAgreement={overallAgreement}
        pairwiseComparisons={pairwiseComparisons}
        responseCount={agreementAnswers.length}
        averageConfidence={averageConfidence}
        excludedModels={excludedModels}
      />

      {/* 4. Individual Responses Section (matches wireframe order - at bottom) */}
      <ResponsesSection
        responses={viewResponses}
        manualResponses={viewManualResponses}
        pendingModels={pendingModels}
        maxExpandedCards={MAX_EXPANDED_CARDS}
        onRetry={handleRetry}
        onBack={handleBack}
        onAddManualResponse={handleAddManualAnswer}
      />

      {/* 5. Cost of the run (updates as consensus calls finish) */}
      {runCost && (
        <RunCostSummary
          className="mt-8"
          variant="actual"
          callCount={runCost.callCount}
          totalUsd={runCost.totalUsd}
          estimated={runCost.estimated}
          unpricedModels={runCost.unpricedModels}
          pricedCallCount={runCost.pricedCallCount}
          unpricedCallCount={runCost.unpricedCallCount}
          priceDate={PRICE_TABLE_DATE}
        />
      )}

      {/* 6. Action Buttons */}
      <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <WorkflowNavigator
          currentStep="review"
          backLabel={t("pages.review.backButton")}
          continueLabel={t("pages.review.startOverButton")}
          onBack={handleBack}
          onContinue={handleStartOver}
        />
        <Button
          variant="outline"
          onClick={handleNewComparison}
          className="self-end md:self-auto"
        >
          {t("pages.review.newComparisonButton")}
        </Button>
      </div>
    </div>
  );
}
