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
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { Card } from '@/components/atoms/Card';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';

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
      <ProgressSteps currentStep={currentStep} />

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
          <div className="flex items-center justify-between mb-4">
            <Heading level={3} size="lg">{t('pages.prompt.inputLabel')}</Heading>
            <Text variant="caption" color="muted">{t('pages.prompt.keyboardHint')}</Text>
          </div>
          <textarea
            value={localPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={t('pages.prompt.placeholder')}
            className="w-full min-h-[200px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            data-testid="prompt-textarea"
          />
        </div>

        {/* Tips for better prompts */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="p-6">
            <Heading level={3} size="lg" className="mb-4 text-blue-900 dark:text-blue-100">
              {t('pages.prompt.tipsHeading')}
            </Heading>
            <Text variant="body" color="muted" className="mb-4 text-blue-800 dark:text-blue-200">
              {t('pages.prompt.tipsDescription')}
            </Text>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>
                <strong>{t('pages.prompt.tip1')}</strong>
              </li>
              <li>
                <strong>{t('pages.prompt.tip2')}</strong>
              </li>
              <li>
                <strong>{t('pages.prompt.tip3')}</strong>
              </li>
              <li>
                <strong>{t('pages.prompt.tip4')}</strong>
              </li>
            </ul>
          </div>
        </Card>
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
