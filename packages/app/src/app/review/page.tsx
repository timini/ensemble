/**
 * Review Page (T167-T171)
 *
 * Step 4 of the 4-step workflow: Review Responses
 * Displays streaming responses, agreement analysis, and consensus
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from '~/lib/agreement';
import { generateEmbeddingsForResponses } from '~/lib/embeddings';
import { toError } from '~/lib/errors';
import { PageHero } from '@/components/organisms/PageHero';
import { ResponseCard } from '@/components/molecules/ResponseCard';
import { ConsensusCard } from '@/components/organisms/ConsensusCard';
import { AgreementAnalysis } from '@/components/organisms/AgreementAnalysis';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { Card } from '@/components/atoms/Card';
import type { Provider } from '@/components/molecules/ResponseCard';
import type { ProviderType } from '~/store/slices/ensembleSlice';

export default function ReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const prompt = useStore((state) => state.prompt);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const responses = useStore((state) => state.responses);
  const agreementStats = useStore((state) => state.agreementStats);
  const metaAnalysis = useStore((state) => state.metaAnalysis);
  const manualResponses = useStore((state) => state.manualResponses);
  const embeddings = useStore((state) => state.embeddings);
  const similarityMatrix = useStore((state) => state.similarityMatrix);
  const mode = useStore((state) => state.mode);
  const embeddingsProvider = useStore((state) => state.embeddingsProvider);
  const hasHydrated = useHasHydrated();

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
  const completeStep = useStore((state) => state.completeStep);
  const clearResponses = useStore((state) => state.clearResponses);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const setEmbeddings = useStore((state) => state.setEmbeddings);
  const calculateAgreementState = useStore(
    (state) => state.calculateAgreement,
  );

  const skipRedirectRef = useRef(false);
  const embeddingFetchRef = useRef(false);
  const lastEmbeddingsProviderRef = useRef<ProviderType | null>(null);

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

  // Mock responses for Phase 2 (will be replaced with real API calls in Phase 3/4)
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    // If no prompt, redirect back to prompt page unless a manual navigation already triggered a redirect.
    if (!prompt) {
      if (skipRedirectRef.current) {
        skipRedirectRef.current = false;
        return;
      }

      router.push('/prompt');
      return;
    }

    setCurrentStep('review');
    completeStep('review');

    // TODO: In Phase 3/4, trigger actual API calls here
    // For now, we just display empty state or mock data
  }, [completeStep, hasHydrated, prompt, router, setCurrentStep]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (completedResponses.length === 0) {
      return;
    }

    const providerChanged =
      lastEmbeddingsProviderRef.current !== embeddingsProvider;
    const existingEmbeddings = providerChanged ? [] : viewEmbeddings;
    const pendingResponses = completedResponses.filter(
      (response) =>
        !existingEmbeddings.some(
          (embedding) => embedding.modelId === response.modelId,
        ),
    );

    if (!providerChanged && pendingResponses.length === 0) {
      if (viewEmbeddings.length >= 2 && !viewSimilarityMatrix) {
        calculateAgreementState();
      }
      return;
    }

    if (embeddingFetchRef.current) {
      return;
    }

    embeddingFetchRef.current = true;
    let cancelled = false;

    (async () => {
      const orderedEmbeddings = await generateEmbeddingsForResponses({
        responses: completedResponses,
        existingEmbeddings,
        provider: embeddingsProvider,
        mode: mode === 'pro' ? 'pro' : 'free',
        onError: (modelId, error: Error) => {
          console.error(
            `Failed to generate embeddings for ${modelId} via ${embeddingsProvider}`,
            error,
          );
        },
      });

      if (cancelled) return;

      lastEmbeddingsProviderRef.current = embeddingsProvider;
      setEmbeddings(orderedEmbeddings);

      if (orderedEmbeddings.length >= 2) {
        calculateAgreementState();
      }
    })().catch((error: unknown) => {
      console.error(
        'Failed to process embeddings',
        toError(error, 'Unable to process embeddings'),
      );
    })
      .finally(() => {
        embeddingFetchRef.current = false;
      });

    return () => {
      cancelled = true;
      embeddingFetchRef.current = false;
    };
  }, [
    calculateAgreementState,
    completedResponses,
    embeddingsProvider,
    hasHydrated,
    mode,
    setEmbeddings,
    viewEmbeddings,
    viewSimilarityMatrix,
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
    skipRedirectRef.current = true;
    clearResponses();
    setCurrentStep('config');
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

      {/* Display the prompt */}
      <Card className="mt-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('pages.review.promptLabel')}</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-gray-900 dark:text-gray-100">{displayPrompt}</p>
          </div>
        </div>
      </Card>

      {/* Responses Section */}
      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold">{t('pages.review.responsesHeading')}</h3>

        {viewResponses.length === 0 && viewManualResponses.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
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

      {/* Agreement Analysis Section */}
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

      {/* Consensus Section */}
      {viewMetaAnalysis && summarizerModel && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={summarizerModel}
            consensusText={viewMetaAnalysis}
          />
        </div>
      )}

      {/* Action Buttons */}
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
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors self-end md:self-auto"
        >
          {t('pages.review.newComparisonButton')}
        </button>
      </div>
    </div>
  );
}

function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
