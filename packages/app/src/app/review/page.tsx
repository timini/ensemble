/**
 * Review Page (T167-T171)
 *
 * Step 4 of the 4-step workflow: Review Responses
 * Displays streaming responses, agreement analysis, and consensus
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ResponseCard } from '@/components/molecules/ResponseCard';
import { ConsensusCard } from '@/components/organisms/ConsensusCard';
import { AgreementAnalysis } from '@/components/organisms/AgreementAnalysis';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { Card } from '@/components/atoms/Card';
import type { Provider } from '@/components/molecules/ResponseCard';

export default function ReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const prompt = useStore((state) => state.prompt);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const responses = useStore((state) => state.responses);
  const agreementStats = useStore((state) => state.agreementStats);
  const metaAnalysis = useStore((state) => state.metaAnalysis);

  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);
  const clearResponses = useStore((state) => state.clearResponses);
  const resetStreamingState = useStore((state) => state.resetStreamingState);

  const skipRedirectRef = useRef(false);

  // Mock responses for Phase 2 (will be replaced with real API calls in Phase 3/4)
  useEffect(() => {
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
  }, [completeStep, prompt, router, setCurrentStep]);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps currentStep="review" />

      <PageHero
        title={t('pages.review.title')}
        description={t('pages.review.description')}
      />

      {/* Display the prompt */}
      <Card className="mt-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('pages.review.promptLabel')}</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-gray-900 dark:text-gray-100">{prompt}</p>
          </div>
        </div>
      </Card>

      {/* Responses Section */}
      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold">{t('pages.review.responsesHeading')}</h3>

        {responses.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              {t('pages.review.noResponses')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Agreement Analysis Section */}
      {agreementStats && responses.length >= 2 && (
        <div className="mt-8">
          <AgreementAnalysis
            overallAgreement={agreementStats.mean}
            pairwiseComparisons={[]}
            responseCount={responses.length}
            comparisonCount={0}
            averageConfidence={0}
          />
        </div>
      )}

      {/* Consensus Section */}
      {metaAnalysis && summarizerModel && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={summarizerModel}
            consensusText={metaAnalysis}
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
