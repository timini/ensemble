/**
 * Ensemble Page (T158)
 *
 * Step 2 of the 4-step workflow: Model Selection
 * User selects 2-6 AI models and designates one as the summarizer
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModelSelectionList } from '@/components/organisms/ModelSelectionList';
import { EnsembleSidebar, type Preset } from '@/components/organisms/EnsembleSidebar';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ApiKeyConfigurationModal } from '@/components/organisms/ApiKeyConfigurationModal';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { ManualResponseModal } from '@/components/organisms/ManualResponseModal';
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
  const addManualResponse = useStore((state) => state.addManualResponse);
  const manualResponses = useStore((state) => state.manualResponses);

  const currentStep = useStore((state) => state.currentStep);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);

  // Track selected model IDs for ModelSelectionList
  // NOTE: We use the 'model' field (e.g., 'gpt-4o'), not the dynamic 'id' field
  const selectedModelIds = useMemo(() => selectedModels.map((m) => m.model), [selectedModels]);

  // Build provider status map based on mode
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  const providerStatus = mode === 'pro'
    ? {
        // Pro mode: all providers included in subscription
        openai: 'Ready',
        anthropic: 'Ready',
        google: 'Ready',
        xai: 'Ready',
      }
    : {
        // Free mode (and mock mode): check for configured API keys
        openai: apiKeys.openai?.key ? 'Ready' : 'API key required',
        anthropic: apiKeys.anthropic?.key ? 'Ready' : 'API key required',
        google: apiKeys.google?.key ? 'Ready' : 'API key required',
        xai: apiKeys.xai?.key ? 'Ready' : 'API key required',
      };

  // Presets matching wireframe design
  const [presets] = useState<Preset[]>([
    {
      id: 'research-synthesis',
      name: 'Research Synthesis',
      description: 'Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis.',
      modelIds: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1-5-pro'],
      summarizerId: 'claude-3-5-sonnet',
      summarizerName: 'Claude 3.5 Sonnet',
    },
    {
      id: 'rapid-drafting',
      name: 'Rapid Drafting',
      description: 'Fast, budget-friendly models tuned for quick ideation and iteration.',
      modelIds: ['gpt-4o-mini', 'claude-3-haiku', 'gemini-1-5-flash'],
      summarizerId: 'gpt-4o-mini',
      summarizerName: 'GPT-4o Mini',
    },
    {
      id: 'balanced-perspective',
      name: 'Balanced Perspective',
      description: 'Balanced trio for contrasting opinions and concise summaries.',
      modelIds: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1-5-pro'],
      summarizerId: 'gpt-4o',
      summarizerName: 'GPT-4o',
    },
  ]);
  const [currentEnsembleName] = useState('');

  // Modal state for API key configuration
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualResponse, setManualResponse] = useState('');
  const [manualModelName, setManualModelName] = useState('');
  const [manualModelProvider, setManualModelProvider] = useState('');

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
    // Check if selected by comparing the 'model' field (not the dynamic 'id' field)
    const selectedModel = selectedModels.find((m) => m.model === modelId);
    const isSelected = !!selectedModel;

    if (isSelected) {
      // Remove using the dynamic ID from the store
      removeModel(selectedModel.id);
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
    void setApiKey(provider, value).catch((error) => {
      console.error(`Failed to store ${provider} API key`, error);
    });
    debouncedValidate(provider, value, mode, handleValidationStatusChange);
  };

  const handleToggleShow = (provider: Provider) => {
    toggleApiKeyVisibility(provider);
  };

  // Set current step to 'ensemble' on mount
  useEffect(() => {
    setCurrentStep('ensemble');
  }, [setCurrentStep]);

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

  // Map selected model metadata for the sidebar display
  const sidebarModels = selectedModels.map((selection) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === selection.model);
    return {
      id: selection.model,
      name: model?.name ?? selection.model,
    };
  });

  // Continue button enabled if 2-6 models selected
  const isValid = selectedModels.length >= 2 && selectedModels.length <= 6;

  const handleAddManualResponse = () => {
    setManualModalOpen(true);
  };

  const resetManualForm = () => {
    setManualResponse('');
    setManualModelName('');
    setManualModelProvider('');
  };

  const handleManualSubmit = (data: {
    response: string;
    modelName: string;
    modelProvider: string;
  }) => {
    const labelBase = data.modelName.trim() || t('organisms.manualResponseModal.title', { defaultValue: 'Manual Response' });
    const providerSuffix = data.modelProvider.trim()
      ? ` (${data.modelProvider.trim()})`
      : '';

    addManualResponse(`${labelBase}${providerSuffix}`, data.response.trim());
    resetManualForm();
    setManualModalOpen(false);
  };

  const handleManualCancel = () => {
    resetManualForm();
    setManualModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps currentStep={currentStep} fallbackStep="ensemble" />

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
            isMockMode={isMockMode}
            onModelToggle={handleModelToggle}
            onSummarizerChange={handleSummarizerChange}
            onConfigureApiKey={handleConfigureApiKey}
          />
        </div>

        {/* Ensemble Sidebar - Takes 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <EnsembleSidebar
            selectedModels={sidebarModels}
            summarizerId={summarizerModel ?? undefined}
            presets={presets}
            currentEnsembleName={currentEnsembleName}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            onAddManualResponse={handleAddManualResponse}
            manualResponses={manualResponses}
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

      <ManualResponseModal
        open={manualModalOpen}
        onOpenChange={(open) => {
          setManualModalOpen(open);
          if (!open) {
            resetManualForm();
          }
        }}
        value={manualResponse}
        onChange={setManualResponse}
        modelName={manualModelName}
        onModelNameChange={setManualModelName}
        modelProvider={manualModelProvider}
        onModelProviderChange={setManualModelProvider}
        onSubmit={handleManualSubmit}
        onCancel={handleManualCancel}
      />
    </div>
  );
}
