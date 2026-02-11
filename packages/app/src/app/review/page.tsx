/**
 * Review Page (T167-T171)
 *
 * Step 4 of the 4-step workflow: Review Responses
 * Displays streaming responses, agreement analysis, and consensus
 */

"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/organisms/PageHero";
import { ResponseCard } from "@/components/molecules/ResponseCard";
import { ConsensusCard } from "@/components/organisms/ConsensusCard";
import { AgreementAnalysis } from "@/components/organisms/AgreementAnalysis";
import { ProgressSteps } from "@/components/molecules/ProgressSteps";
import { WorkflowNavigator } from "@/components/organisms/WorkflowNavigator";
import { PromptCard } from "@/components/organisms/PromptCard";
import { ShareDialog } from "@/components/organisms/ShareDialog";
import type { Provider } from "@/components/molecules/ResponseCard";
import { useReviewPageState } from "./hooks/useReviewPageState";
import { useResponseEmbeddings } from "./hooks/useResponseEmbeddings";
import { useStreamingResponses } from "./hooks/useStreamingResponses";
import { useConsensusGeneration } from "./hooks/useConsensusGeneration";
import { useShareReview } from "./hooks/useShareReview";
import { useAutoConsensus } from "./hooks/useAutoConsensus";

export default function ReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const skipRedirectRef = useRef(false);

  const state = useReviewPageState();

  const { retryModel } = useStreamingResponses({
    hasHydrated: state.hasHydrated,
    prompt: state.prompt,
    mode: state.mode,
    skipRedirectRef,
  });

  useResponseEmbeddings({
    hasHydrated: state.hasHydrated,
    completedResponses: state.completedResponses,
    embeddingsProvider: state.embeddingsProvider,
    viewEmbeddings: state.viewEmbeddings,
    viewSimilarityMatrix: state.viewSimilarityMatrix,
    mode: state.mode,
    setEmbeddings: state.setEmbeddings,
    calculateAgreementState: state.calculateAgreement,
  });

  const { isGenerating: isGeneratingConsensus } = useConsensusGeneration();

  useAutoConsensus();

  const share = useShareReview({
    responses: state.viewResponses,
    manualResponses: state.viewManualResponses,
    consensusText: state.viewMetaAnalysis,
    agreementStats: state.viewAgreementStats,
    overallAgreement: state.overallAgreement,
    pairwiseComparisons: state.pairwiseComparisons,
  });

  const handleBack = () => {
    state.setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleNewComparison = () => {
    state.resetStreamingState();
    state.setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleStartOver = () => {
    skipRedirectRef.current = true;
    state.setCurrentStep("config");
    router.push("/config");
    state.clearResponses();
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps currentStep="review" fallbackStep="review" />

      <PageHero
        title={t("pages.review.title")}
        description={t("pages.review.description")}
      />

      <div className="mt-8">
        <PromptCard prompt={state.displayPrompt} />
      </div>

      {(state.viewMetaAnalysis !== null || isGeneratingConsensus) && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={
              state.summarizerModel ??
              state.selectedModels[0]?.id ??
              "AI Model"
            }
            consensusText={state.viewMetaAnalysis ?? undefined}
            isLoading={isGeneratingConsensus}
            onShare={
              state.viewMetaAnalysis
                ? () => void share.handleShare()
                : undefined
            }
          />
        </div>
      )}

      <ShareDialog
        open={share.dialogOpen}
        onOpenChange={share.setDialogOpen}
        shareUrl={share.shareUrl}
        isLoading={share.isSharing}
        error={share.shareError}
        onCopyLink={share.handleCopyLink}
      />

      {state.pairwiseComparisons.length > 0 && (
        <div className="mt-8">
          <AgreementAnalysis
            overallAgreement={state.overallAgreement}
            pairwiseComparisons={state.pairwiseComparisons}
            responseCount={state.completedResponses.length}
            comparisonCount={state.pairwiseComparisons.length}
            averageConfidence={state.averageConfidence}
          />
        </div>
      )}

      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold">
          {t("pages.review.responsesHeading")}
        </h3>

        {state.viewResponses.length === 0 &&
        state.viewManualResponses.length === 0 ? (
          <div className="rounded-lg bg-muted p-8 text-center">
            <p className="text-muted-foreground">
              {t("pages.review.noResponses")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.viewResponses.map((response) => (
              <ResponseCard
                key={response.modelId}
                modelName={response.model}
                provider={response.provider as Provider}
                status={
                  response.error
                    ? "error"
                    : response.isStreaming
                      ? "streaming"
                      : "complete"
                }
                responseType="ai"
                content={response.response}
                error={response.error ?? undefined}
                responseTime={
                  response.responseTime
                    ? `${response.responseTime}ms`
                    : undefined
                }
                testId={`response-card-${response.modelId}`}
                tokenCount={response.tokenCount ?? undefined}
                onRetry={() => retryModel(response.modelId)}
              />
            ))}
            {state.viewManualResponses.map((manual) => (
              <ResponseCard
                key={manual.id}
                modelName={manual.label}
                status="complete"
                responseType="manual"
                content={manual.response}
                defaultExpanded={false}
                testId={`manual-response-card-${manual.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <WorkflowNavigator
          currentStep="review"
          backLabel={t("pages.review.backButton")}
          continueLabel={t("pages.review.startOverButton")}
          onBack={handleBack}
          onContinue={handleStartOver}
        />
        <button
          onClick={handleNewComparison}
          className="self-end rounded-lg border border-border px-6 py-2 transition-colors hover:bg-accent md:self-auto"
        >
          {t("pages.review.newComparisonButton")}
        </button>
      </div>
    </div>
  );
}
