import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ModelCard, type ModelModality, type Provider } from '../../molecules/ModelCard';
import { Heading } from '../../atoms/Heading';

export interface Model {
  id: string;
  provider: Provider;
  name: string;
  modalities?: ModelModality[];
}

export interface ModelSelectionListProps {
  /** Array of available models */
  models: Model[];
  /** Array of selected model IDs */
  selectedModelIds: string[];
  /** ID of the model designated as summarizer */
  summarizerModelId?: string;
  /** Maximum number of models that can be selected */
  maxSelection?: number;
  /** Provider status map (e.g., 'Ready', 'API key required') */
  providerStatus?: Partial<Record<Provider, string>>;
  /** Callback when a model is toggled */
  onModelToggle: (modelId: string) => void;
  /** Callback when summarizer designation changes */
  onSummarizerChange: (modelId: string) => void;
  /** Callback when configure API key button is clicked */
  onConfigureApiKey?: (provider: Provider) => void;
  /** @deprecated No longer used. Selection is always gated by provider status. */
  isMockMode?: boolean;
}


/**
 * ModelSelectionList organism for selecting AI models.
 *
 * Composes ModelCard molecules to create a grouped list of selectable AI models.
 * Models are organized by provider with support for max selection limits and
 * summarizer designation.
 *
 * @example
 * ```tsx
 * <ModelSelectionList
 *   models={availableModels}
 *   selectedModelIds={['gpt-4', 'claude-3-opus']}
 *   summarizerModelId="claude-3-opus"
 *   maxSelection={6}
 *   onModelToggle={(id) => toggleSelection(id)}
 *   onSummarizerChange={(id) => setSummarizer(id)}
 * />
 * ```
 */
export const ModelSelectionList = React.forwardRef<HTMLDivElement, ModelSelectionListProps>(
  (
    {
      models,
      selectedModelIds,
      summarizerModelId,
      maxSelection,
      providerStatus,
      isMockMode: _deprecatedIsMockMode,
      onModelToggle,
      onSummarizerChange,
      onConfigureApiKey,
    },
    ref
  ) => {
    const { t } = useTranslation();
    void _deprecatedIsMockMode;

    // Group models by provider
    const modelsByProvider = React.useMemo(() => {
      const grouped: Record<Provider, Model[]> = {
        openai: [],
        anthropic: [],
        google: [],
        xai: [],
        deepseek: [],
        perplexity: [],
      };

      models.forEach((model) => {
        grouped[model.provider].push(model);
      });

      return grouped;
    }, [models]);

    // Check if max selection is reached
    const isMaxSelectionReached = maxSelection
      ? selectedModelIds.length >= maxSelection
      : false;

    // Render empty state
    if (models.length === 0) {
      return (
        <div ref={ref} className="text-center py-8 text-muted-foreground">
          {t('organisms.modelSelectionList.noModels')}
        </div>
      );
    }

    return (
      <div ref={ref} data-testid="model-selection-list">
        {(Object.keys(modelsByProvider) as Provider[]).map((provider) => {
          const providerModels = modelsByProvider[provider];

          // Skip provider if no models
          if (providerModels.length === 0) {
            return null;
          }

          return (
            <div key={provider} data-testid="provider-section" className="mb-8">
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <Heading level={4} size="lg" className="text-foreground">{t(`providers.${provider}`)}</Heading>
                {providerStatus?.[provider] && (
                  <div className="flex items-center gap-2">
                    {providerStatus[provider] === 'Ready' ? (
                      <span className="text-sm text-success font-medium">
                        ✓ {providerStatus[provider]}
                      </span>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground">{providerStatus[provider]}</span>
                        {onConfigureApiKey && (
                          <button
                            onClick={() => onConfigureApiKey(provider)}
                            className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded border border-primary/30 transition-colors"
                          >
                            Configure
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Model Grid */}
              <div className="grid grid-cols-3 gap-4">
                {providerModels.map((model) => {
                  const isSelected = selectedModelIds.includes(model.id);
                  const isSummarizer = summarizerModelId === model.id;
                  const providerStatusMessage = providerStatus?.[provider]?.toLowerCase() ?? '';
                  const providerRequiresApiKey =
                    providerStatusMessage.includes('required') ||
                    providerStatusMessage.includes('api key');
                  // Disable model if:
                  // 1. Max selection reached AND model is not already selected
                  // 2. Provider requires API key (regardless of selection state)
                  const isDisabled = !isSelected && (isMaxSelectionReached || providerRequiresApiKey);

                  return (
                    <ModelCard
                      key={model.id}
                      modelId={model.id}
                      provider={model.provider}
                      modelName={model.name}
                      modalities={model.modalities}
                      selected={isSelected}
                      isSummarizer={isSummarizer}
                      disabled={isDisabled}
                      onClick={() => onModelToggle(model.id)}
                      onSummarizerClick={isSelected ? () => onSummarizerChange(model.id) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

ModelSelectionList.displayName = 'ModelSelectionList';
