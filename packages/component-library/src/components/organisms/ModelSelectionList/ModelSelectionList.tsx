import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ModelCard, type Provider } from '../../molecules/ModelCard';
import { Heading } from '../../atoms/Heading';

export interface Model {
  id: string;
  provider: Provider;
  name: string;
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
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'XAI',
};

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
      onModelToggle,
      onSummarizerChange: _onSummarizerChange,
    },
    ref
  ) => {
    const { t } = useTranslation();

    // Group models by provider
    const modelsByProvider = React.useMemo(() => {
      const grouped: Record<Provider, Model[]> = {
        openai: [],
        anthropic: [],
        google: [],
        xai: [],
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
        <div ref={ref} className="text-center py-8 text-gray-500">
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
                <Heading level={4} size="lg" className="text-gray-900">{PROVIDER_LABELS[provider]}</Heading>
                {providerStatus?.[provider] && (
                  <span className="text-sm text-blue-600">{providerStatus[provider]}</span>
                )}
              </div>

              {/* Model Grid */}
              <div className="grid grid-cols-3 gap-4">
                {providerModels.map((model) => {
                  const isSelected = selectedModelIds.includes(model.id);
                  const isSummarizer = summarizerModelId === model.id;
                  const providerRequiresApiKey =
                    providerStatus?.[provider]?.toLowerCase().includes('required') ||
                    providerStatus?.[provider]?.toLowerCase().includes('api key');
                  const isDisabled = (!isSelected && isMaxSelectionReached) || providerRequiresApiKey;

                  return (
                    <ModelCard
                      key={model.id}
                      provider={model.provider}
                      modelName={model.name}
                      selected={isSelected}
                      isSummarizer={isSummarizer}
                      disabled={isDisabled}
                      onClick={() => onModelToggle(model.id)}
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
