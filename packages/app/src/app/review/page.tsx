/**
 * Review Page (T167-T171)
 *
 * Step 4 of the 4-step workflow: Review Responses
 * Displays streaming responses, agreement analysis, and consensus
 */

'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { useHasHydrated } from '~/hooks/useHasHydrated';
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from '~/lib/agreement';
import { PageHero } from '@/components/organisms/PageHero';
import { ResponseCard } from '@/components/molecules/ResponseCard';
import { ConsensusCard } from '@/components/organisms/ConsensusCard';
import { AgreementAnalysis } from '@/components/organisms/AgreementAnalysis';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { PromptCard } from '@/components/organisms/PromptCard';
import type { Provider } from '@/components/molecules/ResponseCard';
import { useResponseEmbeddings } from './hooks/useResponseEmbeddings';
import { useStreamingResponses } from './hooks/useStreamingResponses';
import { useConsensusGeneration } from './hooks/useConsensusGeneration';
import { useEffect } from 'react';

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

  const calculateAgreementState = useStore(
    (state) => state.calculateAgreement,
  );

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

  const { generateConsensus, isGenerating: isGeneratingConsensus } = useConsensusGeneration();

  // Effect: Trigger consensus generation when all responses are complete
  useEffect(() => {
    if (!hasHydrated || metaAnalysis || isGeneratingConsensus) return;

    // Use summarizer from state (which is an available model ID like "gpt-4o")
    // If no summarizer set, find the first selected model's corresponding available model ID
    let effectiveSummarizerId = summarizerModel;

    if (!effectiveSummarizerId && selectedModels[0]) {
      // selectedModels[0].model contains the model name (e.g., "GPT-4o")
      // We need to find the corresponding available model ID
      // For now, use a lowercase, hyphenated version as a fallback
      // The actual ID format in FALLBACK_MODELS uses lowercase with hyphens
      effectiveSummarizerId = selectedModels[0].model.toLowerCase().replace(/\s+/g, '-');
    }

    if (!effectiveSummarizerId) return;

    const allResponsesComplete = viewResponses.every(r => r.isComplete && !r.isStreaming);
    if (!allResponsesComplete && viewResponses.length > 0) return;

    // Combine responses
    const allCompletedResponses = [
      ...viewResponses.filter(r => r.isComplete && !r.error).map(r => ({ modelId: r.modelId, modelName: r.model, content: r.response })),
      ...viewManualResponses.map(r => ({ modelId: r.id, modelName: r.label, content: r.response ?? '' }))
    ].filter(r => r.content.trim().length > 0);

    if (allCompletedResponses.length >= 2) {
      void generateConsensus(allCompletedResponses, prompt ?? '', effectiveSummarizerId);
    }
  }, [
    hasHydrated,
    viewResponses,
    viewManualResponses,
    metaAnalysis,
    summarizerModel,
    selectedModels,
    prompt,
    generateConsensus,
    isGeneratingConsensus
  ]);

  const handleBack = () => {
    setCurrentStep('prompt');
    router.push('/prompt');
  };

  const handleNewComparison = () => {
    resetStreamingState();
    setCurrentStep('prompt');
    router.push('/prompt');
  };

  const handleStartOver = () => {
    setCurrentStep('config');
    resetStreamingState();
    router.push('/config');
  };

  const displayPrompt = hasHydrated ? prompt ?? '' : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps currentStep="review" fallbackStep="review" />

      <PageHero
        title={t('pages.review.title')}
        description={t('pages.review.description')}
      />

      {/* 1. Prompt Card (matches wireframe order) */}
      <div className="mt-8">
        <PromptCard prompt={displayPrompt} />
      </div>

      {/* 2. Consensus Section (matches wireframe order) */}
      {(viewMetaAnalysis !== null || isGeneratingConsensus) && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={summarizerModel ?? selectedModels[0]?.id ?? 'AI Model'}
            consensusText={viewMetaAnalysis ?? undefined}
            isLoading={isGeneratingConsensus}
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
        <h3 className="text-xl font-semibold">{t('pages.review.responsesHeading')}</h3>

        {viewResponses.length === 0 && viewManualResponses.length === 0 ? (
          <div className="p-8 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">
              {t('pages.review.noResponses')}
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
                    ? 'error'
                    : response.isStreaming
                      ? 'streaming'
                      : 'complete'
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
          backLabel={t('pages.review.backButton')}
          continueLabel={t('pages.review.startOverButton')}
          onBack={handleBack}
          onContinue={handleStartOver}
        />
        <button
          onClick={handleNewComparison}
          className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors self-end md:self-auto"
        >
          {t('pages.review.newComparisonButton')}
        </button>
      </div>
    </div>
  );
}
