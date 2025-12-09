/**
 * Ensemble Page (T158)
 *
 * Step 2 of the 4-step workflow: Model Selection
 * User selects 2-6 AI models and designates one as the summarizer
 */

'use client';

import { useRouter } from 'next/navigation';
import { useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import type { ProviderType } from '~/store/slices/ensembleSlice';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { PageHero } from '@/components/organisms/PageHero';
import { ModelSelectionList } from '@/components/organisms/ModelSelectionList';
import { EnsembleSidebar } from '@/components/organisms/EnsembleSidebar';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ApiKeyConfigurationModal } from '@/components/organisms/ApiKeyConfigurationModal';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { ManualResponseModal } from '@/components/organisms/ManualResponseModal';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { validateApiKey, createDebouncedValidator } from '~/lib/validation';
import { getHydratedStatus, createProviderStatusLabels } from '~/lib/providerStatus';
import { useHasHydrated } from '~/hooks/useHasHydrated';
import { useManualResponseModal } from './hooks/useManualResponseModal';
import { useApiKeyModal } from './hooks/useApiKeyModal';
import { useAvailableModels } from './hooks/useAvailableModels';
import {
  EMPTY_API_KEYS,
  PRESETS,
  DEFAULT_ENSEMBLE_NAME,
} from './page.constants';


export default function EnsemblePage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const mode = useStore((state) => state.mode);
  const apiKeys = useStore((state) => state.apiKeys);
  const setApiKey = useStore((state) => state.setApiKey);
  const toggleApiKeyVisibility = useStore((state) => state.toggleApiKeyVisibility);
  const setApiKeyStatus = useStore((state) => state.setApiKeyStatus);
  const selectedModels = useStore((state) => state.selectedModels);
  const addModel = useStore((state) => state.addModel);
  const removeModel = useStore((state) => state.removeModel);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const setSummarizer = useStore((state) => state.setSummarizer);
  const addManualResponse = useStore((state) => state.addManualResponse);
  const manualResponses = useStore((state) => state.manualResponses);
  const clearSelection = useStore((state) => state.clearSelection);
  const hasHydrated = useHasHydrated();
  const displayMode: OperatingMode = hasHydrated ? mode : 'free';
  const safeApiKeys = hasHydrated ? apiKeys : EMPTY_API_KEYS;
  const viewManualResponses = hasHydrated ? manualResponses : [];

  const currentStep = useStore((state) => state.currentStep);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);

  // Track selected model IDs for ModelSelectionList
  // NOTE: We use the 'model' field (e.g., 'gpt-4o'), not the dynamic 'id' field
  const selectedModelIds = useMemo(() => selectedModels.map((m) => m.model), [selectedModels]);
  const displayedSelectedModelIds = hasHydrated ? selectedModelIds : [];
  const displayedSummarizer = hasHydrated ? summarizerModel ?? undefined : undefined;
  const viewSelectedModels = hasHydrated ? selectedModels : [];



  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  // Presets matching wireframe design
  const currentEnsembleName = DEFAULT_ENSEMBLE_NAME;

  // Modal state for API key configuration
  const manualModal = useManualResponseModal(t, addManualResponse);

  // Validation status derived from store
  const validationStatus = useMemo(
    () => ({
      openai: safeApiKeys.openai?.status ?? 'idle',
      anthropic: safeApiKeys.anthropic?.status ?? 'idle',
      google: safeApiKeys.google?.status ?? 'idle',
      xai: safeApiKeys.xai?.status ?? 'idle',
    }),
    [safeApiKeys],
  );

  const hydratedStatuses = useMemo(
    () => getHydratedStatus(hasHydrated, validationStatus),
    [hasHydrated, validationStatus],
  );

  const availableModels = useAvailableModels({
    hasHydrated,
    mode: displayMode,
    hydratedStatuses,
  });

  const providerStatus = useMemo(
    () =>
      createProviderStatusLabels({
        mode: displayMode,
        statuses: validationStatus,
        hasHydrated,
      }),
    [displayMode, validationStatus, hasHydrated],
  );

  // Store timeout IDs for debouncing
  const timeoutRefs = useRef<Record<Provider, NodeJS.Timeout | null>>({
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
  });

  // Handler for validation status changes
  const handleValidationStatusChange = (provider: Provider, status: ValidationStatus) => {
    setApiKeyStatus(provider as ProviderType, status);
  };

  // Create debounced validator using the reusable utility
  const debouncedValidate = createDebouncedValidator(
    timeoutRefs,
    validateApiKey
  );

  const handleModelToggle = (modelId: string) => {
    if (!hasHydrated) {
      return;
    }
    // Check if selected by comparing the 'model' field (not the dynamic 'id' field)
    const selectedModel = selectedModels.find((m) => m.model === modelId);
    const isSelected = !!selectedModel;

    if (isSelected) {
      // Remove using the dynamic ID from the store
      removeModel(selectedModel.id);
    } else {
      // Add model if under limit
      if (selectedModels.length < 6) {
        const model = availableModels.find((m) => m.id === modelId);
        if (model) {
          addModel(model.provider, model.id);
        }
      }
    }
  };

  const handleSummarizerChange = (modelId: string) => {
    if (!hasHydrated) {
      return;
    }
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

  // Placeholder handlers for EnsembleManagementPanel (to be implemented)
  const handleLoadPreset = (_presetId: string) => {
    // TODO: Implement preset loading
  };

  const handleSavePreset = (_name: string) => {
    // TODO: Implement preset saving
  };

  const handleDeletePreset = (_presetId: string) => {
    // TODO: Implement preset deletion
  };

  const apiKeyModal = useApiKeyModal({
    safeApiKeys,
    hydratedStatuses,
    mode,
    setApiKey,
    debouncedValidate,
    toggleApiKeyVisibility,
    onValidationStatusChange: handleValidationStatusChange,
  });

  // Dynamic models handled by useAvailableModels hook

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
  // Map selected model metadata for the sidebar display
  const sidebarModels = viewSelectedModels.map((selection) => {
    const model = availableModels.find((m) => m.id === selection.model);
    return {
      id: selection.model,
      name: model?.name ?? selection.model,
    };
  });

  // Continue button enabled if 2-6 models selected
  const isValid =
    hasHydrated && selectedModels.length >= 2 && selectedModels.length <= 6;

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
            models={availableModels}
            selectedModelIds={displayedSelectedModelIds}
            summarizerModelId={displayedSummarizer}
            maxSelection={6}
            providerStatus={providerStatus}
            isMockMode={isMockMode}
            onModelToggle={handleModelToggle}
            onSummarizerChange={handleSummarizerChange}
            onConfigureApiKey={apiKeyModal.handleConfigureApiKey}
          />
        </div>

        {/* Ensemble Sidebar - Takes 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <EnsembleSidebar
            selectedModels={sidebarModels}
            summarizerId={displayedSummarizer}
            presets={PRESETS}
            currentEnsembleName={currentEnsembleName}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            onAddManualResponse={manualModal.openModal}
            manualResponses={viewManualResponses}
            onClearAll={clearSelection}
          />
        </div>
      </div>

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleContinue}
          onBack={handleBack}
          continueDisabled={!isValid}
          continueLabel={t('common.next')}
        />
      </div>

      {/* API Key Configuration Modal */}
      <ApiKeyConfigurationModal
        open={apiKeyModal.configModalOpen}
        onOpenChange={apiKeyModal.setConfigModalOpen}
        provider={apiKeyModal.selectedProvider}
        items={apiKeyModal.apiKeyItems}
        onKeyChange={apiKeyModal.handleKeyChange}
        onToggleShow={apiKeyModal.handleToggleShow}
      />

      <ManualResponseModal
        open={manualModal.isOpen}
        onOpenChange={manualModal.handleOpenChange}
        value={manualModal.response}
        onChange={manualModal.setResponse}
        modelName={manualModal.modelName}
        onModelNameChange={manualModal.setModelName}
        modelProvider={manualModal.modelProvider}
        onModelProviderChange={manualModal.setModelProvider}
        onSubmit={manualModal.handleSubmit}
        onCancel={manualModal.handleCancel}
      />
    </div>
  );
}
