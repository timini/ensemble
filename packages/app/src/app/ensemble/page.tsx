/**
 * Ensemble Page (T158)
 *
 * Step 2 of the 4-step workflow: Model Selection
 * User selects 2-6 AI models and designates one as the summarizer
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModelSelectionList } from '@/components/organisms/ModelSelectionList';
import { EnsembleManagementPanel, type Preset } from '@/components/organisms/EnsembleManagementPanel';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ApiKeyConfigurationModal } from '@/components/organisms/ApiKeyConfigurationModal';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { AVAILABLE_MODELS } from '~/lib/models';
import { validateApiKey, createDebouncedValidator } from '~/lib/validation';

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

  // Validation status for the modal
  const [validationStatus, setValidationStatus] = useState<Record<Provider, ValidationStatus>>({
    openai: 'idle',
    anthropic: 'idle',
    google: 'idle',
    xai: 'idle',
  });

  // Store timeout IDs for debouncing
  const timeoutRefs = useRef<Record<Provider, NodeJS.Timeout | null>>({
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
  });

  // Handler for validation status changes
  const handleValidationStatusChange = (provider: Provider, status: ValidationStatus) => {
    setValidationStatus(prev => ({ ...prev, [provider]: status }));
  };

  // Create debounced validator using the reusable utility
  const debouncedValidate = createDebouncedValidator(
    timeoutRefs,
    validateApiKey
  );

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
    debouncedValidate(provider, value, mode, handleValidationStatusChange);
  };

  const handleToggleShow = (provider: Provider) => {
    toggleApiKeyVisibility(provider);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutRefs.current;
    return () => {
      Object.values(timeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Filter API key items to show only the selected provider
  const apiKeyItems = selectedProvider
    ? [
        {
          provider: selectedProvider,
          label: `${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key`,
          value: apiKeys[selectedProvider]?.key ?? '',
          placeholder: selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : selectedProvider === 'google' ? 'AIza...' : 'xai-...',
          helperText: validationStatus[selectedProvider] === 'valid'
            ? 'API key configured'
            : validationStatus[selectedProvider] === 'validating'
            ? 'Validating...'
            : `Enter your ${selectedProvider} API key`,
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
      <ApiKeyConfigurationModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        provider={selectedProvider}
        items={apiKeyItems}
        onKeyChange={handleKeyChange}
        onToggleShow={handleToggleShow}
      />
    </div>
  );
}
