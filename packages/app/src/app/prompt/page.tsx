/**
 * Prompt Page (T162-T166)
 *
 * Step 3 of the 4-step workflow: Prompt Input
 * User enters their prompt and submits to the ensemble
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { useStepNavigation } from '~/hooks/useStepNavigation';
import { PageHero } from '@/components/organisms/PageHero';
import { EnsembleConfigurationSummary } from '@/components/organisms/EnsembleConfigurationSummary';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { PromptTips } from '@/components/organisms/PromptTips';
import { PromptInputWithHint } from '@/components/organisms/PromptInputWithHint';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { ResponseCard } from '@/components/molecules/ResponseCard';
import {
  ProviderRegistry,
  type AIProvider,
} from '@ensemble-ai/shared-utils/providers';
import { FALLBACK_MODELS } from '~/lib/models';
import { toError } from '~/lib/errors';

export default function PromptPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const handleProgressStepClick = useStepNavigation();

  const selectedModels = useStore((state) => state.selectedModels);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const prompt = useStore((state) => state.prompt);
  const setPrompt = useStore((state) => state.setPrompt);
  const manualResponses = useStore((state) => state.manualResponses);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const startStreaming = useStore((state) => state.startStreaming);
  const appendStreamChunk = useStore((state) => state.appendStreamChunk);
  const completeResponse = useStore((state) => state.completeResponse);
  const setError = useStore((state) => state.setError);
  const mode = useStore((state) => state.mode);
  const consensusMethod = useStore((state) => state.consensusMethod);
  const eloTopN = useStore((state) => state.eloTopN);
  const setConsensusMethod = useStore((state) => state.setConsensusMethod);
  const setEloTopN = useStore((state) => state.setEloTopN);
  const setSummarizer = useStore((state) => state.setSummarizer);

  const currentStep = useStore((state) => state.currentStep);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);

  const [localPrompt, setLocalPrompt] = useState(prompt ?? '');

  const selectedModelIds = useMemo(
    () => selectedModels.map((m) => m.model),
    [selectedModels],
  );

  const summarizerForSummary = useMemo(() => {
    if (summarizerModel) return summarizerModel;
    if (selectedModelIds.length > 0) {
      return selectedModelIds[0]!;
    }
    return t('organisms.ensembleConfigurationSummary.noSummarizer');
  }, [selectedModelIds, summarizerModel, t]);

  // Sync local state with Zustand when component mounts or prompt changes
  useEffect(() => {
    setLocalPrompt(prompt ?? '');
  }, [prompt]);

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    setPrompt(value);
  };

  const handleSubmit = () => {
    if (!isValid) return;

    resetStreamingState();

    const registry = ProviderRegistry.getInstance();
    const clientMode: 'mock' | 'free' | 'pro' =
      process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
        ? 'mock'
        : mode === 'pro'
          ? 'pro'
          : 'free';

    const currentPrompt = localPrompt.trim();

    selectedModels.forEach((selection) => {
      const displayName =
        FALLBACK_MODELS.find((model) => model.id === selection.model)?.name ??
        selection.model;

      startStreaming(selection.id, selection.provider, displayName);

      let providerClient: AIProvider;
      try {
        providerClient = registry.getProvider(selection.provider, clientMode);
      } catch (error: unknown) {
        if (registry.hasProvider(selection.provider, 'mock')) {
          providerClient = registry.getProvider(selection.provider, 'mock');
        } else {
          throw toError(
            error,
            `No provider configured for ${selection.provider}`,
          );
        }
      }

      void providerClient
        .streamResponse(
          currentPrompt,
          selection.model,
          (chunk: string) => appendStreamChunk(selection.id, chunk),
          (_fullResponse: string, responseTime: number, tokenCount?: number) => {
            completeResponse(selection.id, responseTime, tokenCount);
          },
          (error: Error) => {
            setError(selection.id, error.message);
          },
        )
        .catch((error: unknown) =>
          setError(selection.id, toError(error).message),
        );
    });

    completeStep('prompt');
    setCurrentStep('review');
    router.push('/review');
  };

  const handleSummarizerChange = (modelId: string) => {
    setSummarizer(modelId);
  };

  const handleBack = () => {
    setCurrentStep('ensemble');
    router.push('/ensemble');
  };

  // Validate: prompt must not be empty
  const isValid = localPrompt.trim().length > 0;

  // Get model names for the summary
  const modelNames = selectedModelIds;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps
        currentStep={currentStep}
        fallbackStep="prompt"
        onStepClick={handleProgressStepClick}
      />

      <PageHero
        title={t('pages.prompt.title')}
        description={t('pages.prompt.description')}
      />

      <div className="mt-8 space-y-8">
        {/* Ensemble Configuration Summary */}
        {selectedModelIds.length > 0 && (
          <EnsembleConfigurationSummary
            selectedModels={modelNames}
            summarizerModel={summarizerForSummary}
            consensusMethod={consensusMethod}
            topN={eloTopN}
            onConsensusMethodChange={setConsensusMethod}
            onTopNChange={setEloTopN}
            onSummarizerChange={handleSummarizerChange}
          />
        )}

        {/* Manual Responses Preview */}
        {manualResponses.length > 0 && (
          <div data-testid="manual-responses-preview" className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t('organisms.ensembleSidebar.manualResponses')}
            </h3>
            <div className="space-y-4">
              {manualResponses.map((manual) => (
                <ResponseCard
                  key={manual.id}
                  responseType="manual"
                  status="complete"
                  content={manual.response}
                  modelName={manual.label}
                  defaultExpanded={false}
                  testId={`manual-preview-${manual.id}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <PromptInputWithHint
          value={localPrompt}
          onChange={handlePromptChange}
        />

        {/* Tips for better prompts */}
        <PromptTips />
      </div>

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleSubmit}
          onBack={handleBack}
          continueDisabled={!isValid}
          continueLabel={t('pages.prompt.generateButton')}
        />
      </div>
    </div>
  );
}
