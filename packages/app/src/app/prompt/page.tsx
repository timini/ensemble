/**
 * Prompt Page (T162-T166)
 *
 * Step 3 of the 4-step workflow: Prompt Input
 * User enters their prompt and submits to the ensemble
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { EnsembleConfigurationSummary } from '@/components/organisms/EnsembleConfigurationSummary';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';

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
  const modelNames = selectedModels.map((m) => m.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHero
        title={t('pages.prompt.title')}
        description={t('pages.prompt.description')}
      />

      <div className="mt-8 space-y-8">
        {/* Ensemble Configuration Summary */}
        {summarizerModel && (
          <EnsembleConfigurationSummary
            selectedModels={modelNames}
            summarizerModel={summarizerModel}
          />
        )}

        {/* Prompt Input */}
        <div>
          <textarea
            value={localPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={t('pages.prompt.placeholder')}
            className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            data-testid="prompt-textarea"
          />
        </div>
      </div>

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleSubmit}
          onBack={handleBack}
          continueDisabled={!isValid}
        />
      </div>
    </div>
  );
}
