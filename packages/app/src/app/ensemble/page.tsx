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
import { ApiKeyConfiguration } from '@/components/organisms/ApiKeyConfiguration';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { AVAILABLE_MODELS } from '~/lib/models';

export default function EnsemblePage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const mode = useStore((state) => state.mode);
  const apiKeys = useStore((state) => state.apiKeys);
  const setApiKey = useStore((state) => state.setApiKey);
  const toggleApiKeyVisibility = useStore((state) => state.toggleApiKeyVisibility);
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

  // Build provider status map based on configured API keys (Free mode only)
  const providerStatus = mode === 'free'
    ? {
        openai: apiKeys.openai?.key ? 'Ready' : 'API key required',
        anthropic: apiKeys.anthropic?.key ? 'Ready' : 'API key required',
        google: apiKeys.google?.key ? 'Ready' : 'API key required',
        xai: apiKeys.xai?.key ? 'Ready' : 'API key required',
      }
    : undefined; // Pro mode doesn't show status

  // Placeholder presets (will be implemented with preset slice later)
  const [presets] = useState<Preset[]>([]);
  const [currentEnsembleName] = useState('');

  // Modal state for API key configuration
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Validation status (placeholder - validation happens on config page)
  const [validationStatus] = useState<Record<Provider, ValidationStatus>>({
    openai: 'idle',
    anthropic: 'idle',
    google: 'idle',
    xai: 'idle',
  });

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

  const handleConfigureApiKey = (provider: Provider) => {
    setSelectedProvider(provider);
    setConfigModalOpen(true);
  };

  const handleKeyChange = (provider: Provider, value: string) => {
    setApiKey(provider, value);
  };

  const handleToggleShow = (provider: Provider) => {
    toggleApiKeyVisibility(provider);
  };

  // Filter API key items to show only the selected provider
  const apiKeyItems = selectedProvider
    ? [
        {
          provider: selectedProvider,
          label: `${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key`,
          value: apiKeys[selectedProvider]?.key ?? '',
          placeholder: selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : selectedProvider === 'google' ? 'AIza...' : 'xai-...',
          helperText: `Enter your ${selectedProvider} API key`,
          validationStatus: validationStatus[selectedProvider],
          showKey: apiKeys[selectedProvider]?.visible ?? false,
        },
      ]
    : [];

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
            providerStatus={providerStatus}
            onModelToggle={handleModelToggle}
            onSummarizerChange={handleSummarizerChange}
            onConfigureApiKey={handleConfigureApiKey}
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

      {/* API Key Configuration Modal */}
      {configModalOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Configure API Key
                </h2>
                <button
                  onClick={() => setConfigModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <ApiKeyConfiguration
                items={apiKeyItems}
                onKeyChange={handleKeyChange}
                onToggleShow={handleToggleShow}
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setConfigModalOpen(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
