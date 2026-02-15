import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { ArrowRight, X } from 'lucide-react';
import { QuickPresetsSection } from './QuickPresetsSection';
import { SaveEnsembleSection } from './SaveEnsembleSection';
import { ManualResponsesSection } from './ManualResponsesSection';

export interface SelectedModel {
  id: string;
  name: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  modelIds: string[];
  summarizerId: string;
  summarizerName: string;
}

export interface EnsembleSidebarProps {
  /** Array of selected models */
  selectedModels: SelectedModel[];
  /** ID of the summarizer model */
  summarizerId?: string;
  /** Array of available presets */
  presets: Preset[];
  /** Name of the current ensemble being edited */
  currentEnsembleName: string;
  /** Whether to show delete buttons on presets */
  showDeleteButtons?: boolean;
  /** Callback when a preset is loaded */
  onLoadPreset: (presetId: string) => void;
  /** Callback when a preset is saved */
  onSavePreset: (name: string) => void;
  /** Callback when a preset is deleted */
  onDeletePreset: (presetId: string) => void;
  /** Callback when add manual response is clicked */
  onAddManualResponse: () => void;
  /** Manual responses to display */
  manualResponses?: Array<{ id: string; label: string; response?: string }>;
  /** Callback when a model is removed from the selection */
  onRemoveModel?: (modelId: string) => void;
  /** Callback when clear all models is clicked */
  onClearAll?: () => void;
  /** Feature flag to show Quick Presets section (default: true) */
  showQuickPresets?: boolean;
  /** Feature flag to show Save Ensemble section (default: true) */
  showSaveEnsemble?: boolean;
  /** Callback when continue to prompt is clicked */
  onContinue?: () => void;
  /** Whether the continue button is disabled */
  continueDisabled?: boolean;
}

/**
 * EnsembleSidebar organism for managing ensemble configuration.
 *
 * Complete sidebar component that displays:
 * - Ensemble summary with description
 * - List of selected models with summarizer indication
 * - Quick presets for loading saved ensembles
 * - Save current ensemble form
 * - Manual responses section
 *
 * @example
 * ```tsx
 * <EnsembleSidebar
 *   selectedModels={[
 *     { id: 'claude-3-opus', name: 'Claude 3 Opus' },
 *     { id: 'gpt-4o', name: 'GPT-4o' }
 *   ]}
 *   summarizerId="claude-3-opus"
 *   presets={savedPresets}
 *   currentEnsembleName=""
 *   onLoadPreset={(id) => loadPreset(id)}
 *   onSavePreset={(name) => saveEnsemble(name)}
 *   onDeletePreset={(id) => deletePreset(id)}
 *   onAddManualResponse={() => openModal()}
 * />
 * ```
 */
export const EnsembleSidebar = React.forwardRef<HTMLDivElement, EnsembleSidebarProps>(
  (
    {
      selectedModels,
      summarizerId,
      presets,
      currentEnsembleName,
      showDeleteButtons = false,
      onLoadPreset,
      onSavePreset,
      onDeletePreset,
      onAddManualResponse,
      manualResponses = [],
      onRemoveModel,
      onClearAll,
      showQuickPresets = true,
      showSaveEnsemble = true,
      onContinue,
      continueDisabled = false,
    },
    ref
  ) => {
    const { t } = useTranslation();

    return (
      <Card ref={ref} className="sticky top-8" data-testid="ensemble-sidebar">
        <CardContent className="p-6">
          <Heading level={3} size="lg" className="mb-4">{t('organisms.ensembleSidebar.heading')}</Heading>
          <Text variant="helper" className="text-muted-foreground mb-6">
            {t('organisms.ensembleSidebar.description')}
          </Text>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Heading level={4} size="sm" className="mb-0">
                {t('organisms.ensembleSidebar.selectedModels', { count: selectedModels.length })}
              </Heading>
              <div className="flex items-center gap-2">
                {summarizerId && <Text as="span" variant="small" color="primary">{t('organisms.ensembleSidebar.summarizerLabel')}</Text>}
                {selectedModels.length > 0 && onClearAll && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onClearAll}
                    data-testid="clear-all-models"
                  >
                    {t('common.clearAll', 'Clear All')}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {selectedModels.length === 0 ? (
                <Text variant="small" color="muted">{t('organisms.ensembleSidebar.noModels')}</Text>
              ) : (
                selectedModels.map((model) => (
                  <div key={model.id} className="flex items-center justify-between text-sm">
                    <span>{model.name}</span>
                    <div className="flex items-center gap-1">
                      {model.id === summarizerId && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-primary/10 text-primary border-primary/20"
                        >
                          {model.name}
                        </Badge>
                      )}
                      {onRemoveModel && (
                        <button
                          type="button"
                          className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => onRemoveModel(model.id)}
                          aria-label={t('organisms.ensembleSidebar.removeModel', { name: model.name })}
                          data-testid={`remove-model-${model.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {showQuickPresets && (
            <QuickPresetsSection
              presets={presets}
              showDeleteButtons={showDeleteButtons}
              onLoadPreset={onLoadPreset}
              onDeletePreset={onDeletePreset}
            />
          )}

          {showSaveEnsemble && (
            <SaveEnsembleSection
              currentEnsembleName={currentEnsembleName}
              onSavePreset={onSavePreset}
            />
          )}

          <ManualResponsesSection
            manualResponses={manualResponses}
            onAddManualResponse={onAddManualResponse}
          />

          {onContinue && (
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={onContinue}
                disabled={continueDisabled}
                data-testid="continue-to-prompt"
              >
                {t('organisms.ensembleSidebar.continueToPrompt')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

EnsembleSidebar.displayName = 'EnsembleSidebar';
