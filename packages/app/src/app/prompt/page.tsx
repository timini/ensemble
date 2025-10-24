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
import { PageHero } from '@/components/organisms/PageHero';
import { EnsembleConfigurationSummary } from '@/components/organisms/EnsembleConfigurationSummary';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { PromptTips } from '@/components/organisms/PromptTips';
import { PromptInputWithHint } from '@/components/organisms/PromptInputWithHint';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';

export default function PromptPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const selectedModels = useStore((state) => state.selectedModels);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const prompt = useStore((state) => state.prompt);
  const setPrompt = useStore((state) => state.setPrompt);

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
    completeStep('prompt');
    setCurrentStep('review');
    router.push('/review');
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ProgressSteps currentStep={currentStep} />

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
          />
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
