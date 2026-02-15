/**
 * Ensemble Page (T158)
 *
 * Step 2 of the 4-step workflow: Model Selection
 * User selects 2+ AI models and designates one as the summarizer
 */

'use client';

import { PageHero } from '@/components/organisms/PageHero';
import { ModelSelectionList } from '@/components/organisms/ModelSelectionList';
import { EnsembleSidebar } from '@/components/organisms/EnsembleSidebar';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ApiKeyConfigurationModal } from '@/components/organisms/ApiKeyConfigurationModal';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { ManualResponseModal } from '@/components/organisms/ManualResponseModal';
import { InlineAlert } from '@/components/atoms/InlineAlert';
import { useEnsemblePage } from './hooks/useEnsemblePage';

export default function EnsemblePage() {
  const {
    t,
    currentStep,
    availableModels,
    displayedSelectedModelIds,
    displayedSummarizer,
    providerStatus,
    isMockMode,
    handleModelToggle,
    handleSummarizerChange,
    apiKeyModal,
    sidebarModels,
    PRESETS,
    currentEnsembleName,
    handleLoadPreset,
    handleSavePreset,
    handleDeletePreset,
    manualModal,
    viewManualResponses,
    clearSelection,
    handleContinue,
    handleBack,
    isValid,
  } = useEnsemblePage();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps currentStep={currentStep} fallbackStep="ensemble" />

      <PageHero
        title={t('pages.ensemble.title')}
        description={t('pages.ensemble.description')}
      />

      <div className="mt-6" data-testid="ensemble-selection-guidance">
        <InlineAlert variant="info">
          <p className="font-semibold" data-testid="selection-guidance-title">
            {t('pages.ensemble.selectionGuidanceTitle')}
          </p>
          <p className="mt-1" data-testid="selection-guidance-description">
            {t('pages.ensemble.selectionGuidanceDescription')}
          </p>
        </InlineAlert>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Model Selection List - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground" data-testid="model-selection-counter">
              {t('pages.ensemble.selectionCounter', {
                count: displayedSelectedModelIds.length,
                max: availableModels.length,
              })}
            </p>
          </div>
          <ModelSelectionList
            models={availableModels}
            selectedModelIds={displayedSelectedModelIds}
            summarizerModelId={displayedSummarizer}
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
            showQuickPresets={false}
            showSaveEnsemble={false}
            onContinue={handleContinue}
            continueDisabled={!isValid}
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
