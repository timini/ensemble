/**
 * Review Page (T167-T171)
 *
 * Step 4 of the 4-step workflow: Review Responses
 * Displays streaming responses, agreement analysis, and consensus
 */

"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from "~/lib/agreement";
import { PageHero } from "@/components/organisms/PageHero";
import { ResponseCard } from "@/components/molecules/ResponseCard";
import { ConsensusCard } from "@/components/organisms/ConsensusCard";
import { AgreementAnalysis } from "@/components/organisms/AgreementAnalysis";
import { ProgressSteps } from "@/components/molecules/ProgressSteps";
import { WorkflowNavigator } from "@/components/organisms/WorkflowNavigator";
import { PromptCard } from "@/components/organisms/PromptCard";
import type { Provider } from "@/components/molecules/ResponseCard";
import { useResponseEmbeddings } from "./hooks/useResponseEmbeddings";
import { useStreamingResponses } from "./hooks/useStreamingResponses";
import { useConsensusGeneration } from "./hooks/useConsensusGeneration";
import { useConsensusStatus } from "./hooks/useConsensusStatus";
import { useConsensusTrigger } from "./hooks/useConsensusTrigger";

export default function ReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const hasHydrated = useHasHydrated();

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

  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const setEmbeddings = useStore((state) => state.setEmbeddings);

  const calculateAgreementState = useStore((state) => state.calculateAgreement);

  const completedResponses = useMemo(
    () =>
      viewResponses.filter(
        (response) =>
          response.isComplete &&
          !response.error &&
          response.response.trim().length > 0,
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

  const { retryModel } = useStreamingResponses({
    hasHydrated,
    prompt,
    mode,
  });

  useResponseEmbeddings({
    hasHydrated,
    completedResponses,
    embeddingsProvider,
    viewEmbeddings,
    viewSimilarityMatrix,
    mode,
    setEmbeddings,
    calculateAgreementState,
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

  const consensusStatus = useConsensusStatus({
    hasHydrated,
    responses: viewResponses,
    metaAnalysis: viewMetaAnalysis,
    isGenerating: isGeneratingConsensus,
    error: consensusError,
  });

  const handleBack = () => {
    setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleNewComparison = () => {
    resetStreamingState();
    setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleStartOver = () => {
    setCurrentStep("config");
    resetStreamingState();
    router.push("/config");
  };

  const displayPrompt = hasHydrated ? (prompt ?? "") : "";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps currentStep="review" fallbackStep="review" />

      <PageHero
        title={t("pages.review.title")}
        description={t("pages.review.description")}
      />

      {/* 1. Prompt Card (matches wireframe order) */}
      <div className="mt-8">
        <PromptCard prompt={displayPrompt} />
      </div>

      {/* 2. Consensus Section (matches wireframe order) */}
      {consensusStatus !== null && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={
              summarizerModel ?? selectedModels[0]?.id ?? "AI Model"
            }
            consensusText={viewMetaAnalysis ?? undefined}
            status={consensusStatus}
            error={consensusError ?? undefined}
          />
        </div>
      )}

      {/* 3. Agreement Analysis Section (matches wireframe order) */}
      {pairwiseComparisons.length > 0 && (
        <div className="mt-8">
          <AgreementAnalysis
            overallAgreement={overallAgreement}
            pairwiseComparisons={pairwiseComparisons}
            responseCount={completedResponses.length}
            comparisonCount={pairwiseComparisons.length}
            averageConfidence={averageConfidence}
          />
        </div>
      )}

      {/* 4. Individual Responses Section (matches wireframe order - at bottom) */}
      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold">
          {t("pages.review.responsesHeading")}
        </h3>

        {viewResponses.length === 0 && viewManualResponses.length === 0 ? (
          <div className="rounded-lg bg-muted p-8 text-center">
            <p className="text-muted-foreground">
              {t("pages.review.noResponses")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewResponses.map((response) => (
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
            {viewManualResponses.map((manual) => (
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

      {/* 5. Action Buttons */}
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
