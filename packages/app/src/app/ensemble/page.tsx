/**
 * Ensemble Page (T158)
 *
 * Step 2 of the 4-step workflow: Model Selection
 * User selects 2-6 AI models and designates one as the summarizer
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModelSelectionList } from '@/components/organisms/ModelSelectionList';
import { EnsembleManagementPanel, type Preset } from '@/components/organisms/EnsembleManagementPanel';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { AVAILABLE_MODELS } from '~/lib/models';

export default function EnsemblePage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const selectedModels = useStore((state) => state.selectedModels);
  const addModel = useStore((state) => state.addModel);
  const removeModel = useStore((state) => state.removeModel);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const setSummarizer = useStore((state) => state.setSummarizer);

  const currentStep = useStore((state) => state.currentStep);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);

  // Track selected model IDs for ModelSelectionList
  const selectedModelIds = selectedModels.map((m) => m.id);

  // Placeholder presets (will be implemented with preset slice later)
  const [presets] = useState<Preset[]>([]);
  const [currentEnsembleName] = useState('');

  const handleModelToggle = (modelId: string) => {
    const isSelected = selectedModels.some((m) => m.id === modelId);

    if (isSelected) {
      removeModel(modelId);
    } else {
      // Add model if under limit
      if (selectedModels.length < 6) {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        if (model) {
          addModel(model.provider, model.id);
        }
      }
    }
  };

  const handleSummarizerChange = (modelId: string) => {
    setSummarizer(modelId);
  };

  const handleContinue = () => {
    completeStep('ensemble');
    setCurrentStep('prompt');
    router.push('/prompt');
  };

  const handleBack = () => {
    setCurrentStep('config');
    router.push('/config');
  };

  // Placeholder handlers for EnsembleManagementPanel
  const handleLoadPreset = (presetId: string) => {
    console.log('Load preset:', presetId);
  };

  const handleSavePreset = (name: string) => {
    console.log('Save preset:', name);
  };

  const handleDeletePreset = (presetId: string) => {
    console.log('Delete preset:', presetId);
  };

  // Continue button enabled if 2-6 models selected
  const isValid = selectedModels.length >= 2 && selectedModels.length <= 6;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHero
        title={t('pages.ensemble.title')}
        description={t('pages.ensemble.description')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Model Selection List - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <ModelSelectionList
            models={AVAILABLE_MODELS}
            selectedModelIds={selectedModelIds}
            summarizerModelId={summarizerModel ?? undefined}
            maxSelection={6}
            onModelToggle={handleModelToggle}
            onSummarizerChange={handleSummarizerChange}
          />
        </div>

        {/* Ensemble Management Panel - Takes 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <EnsembleManagementPanel
            presets={presets}
            currentEnsembleName={currentEnsembleName}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
          />
        </div>
      </div>

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleContinue}
          onBack={handleBack}
          continueDisabled={!isValid}
        />
      </div>
    </div>
  );
}
