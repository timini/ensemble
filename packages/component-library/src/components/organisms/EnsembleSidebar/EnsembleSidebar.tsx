import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { ArrowRight, Info, Trash2 } from 'lucide-react';

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
  /** Callback when clear all models is clicked */
  onClearAll?: () => void;
  /** Feature flag to show Quick Presets section (default: true) */
  showQuickPresets?: boolean;
  /** Feature flag to show Save Ensemble section (default: true) */
  showSaveEnsemble?: boolean;
  /** Callback when continue button is clicked */
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
      onClearAll,
      showQuickPresets = true,
      showSaveEnsemble = true,
      onContinue,
      continueDisabled = false,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [ensembleName, setEnsembleName] = React.useState(currentEnsembleName);

    // Update local state when prop changes
    React.useEffect(() => {
      setEnsembleName(currentEnsembleName);
    }, [currentEnsembleName]);

    const handleSave = () => {
      if (ensembleName.trim()) {
        onSavePreset(ensembleName.trim());
      }
    };

    return (
      <Card ref={ref} className="sticky top-8" data-testid="ensemble-sidebar">
        <CardContent className="p-6">
          {/* Ensemble Summary */}
          <Heading level={3} size="lg" className="mb-4">{t('organisms.ensembleSidebar.heading')}</Heading>
          <Text variant="helper" className="text-muted-foreground mb-6">
            {t('organisms.ensembleSidebar.description')}
          </Text>

          {/* Selected Models */}
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
                    {model.id === summarizerId && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {model.name}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Continue to Prompt */}
          {onContinue && (
            <div className="mb-6">
              <Button
                variant="default"
                className="w-full"
                onClick={onContinue}
                disabled={continueDisabled}
                data-testid="continue-to-prompt"
              >
                {t('organisms.ensembleSidebar.continueToPrompt', 'Continue to Prompt')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Quick Presets */}
          {showQuickPresets && (
            <div className="mb-6">
              <Heading level={4} size="sm" className="mb-3">{t('organisms.ensembleSidebar.quickPresets')}</Heading>
              <Text variant="caption" color="muted" className="mb-4">
                {t('organisms.ensembleSidebar.quickPresetsDescription')}
              </Text>

              {presets.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {t('organisms.ensembleSidebar.noPresets')}
                </div>
              ) : (
                <div className="space-y-3">
                  {presets.map((preset) => (
                    <div key={preset.id} className="border border-border rounded-lg p-3 relative">
                      <div className="flex items-center justify-between mb-2">
                        <Heading level={5} size="sm">{preset.name}</Heading>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent"
                            onClick={() => onLoadPreset(preset.id)}
                          >
                            {t('organisms.ensembleSidebar.usePreset')}
                          </Button>
                          {showDeleteButtons && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onDeletePreset(preset.id)}
                              aria-label={t('organisms.ensembleSidebar.deletePreset', { name: preset.name })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Text variant="caption" className="text-muted-foreground mb-2">{preset.description}</Text>
                      <Text variant="caption" color="muted">{t('organisms.ensembleSidebar.summarizerInfo', { name: preset.summarizerName })}</Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Current Ensemble */}
          {showSaveEnsemble && (
            <div className="mb-6">
              <Heading level={4} size="sm" className="mb-3">{t('organisms.ensembleSidebar.saveCurrentEnsemble')}</Heading>
              <Text variant="caption" color="muted" className="mb-3">{t('organisms.ensembleSidebar.saveDescription')}</Text>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t('organisms.ensembleSidebar.ensembleNameLabel')}</label>
                  <Input
                    placeholder={t('organisms.ensembleSidebar.ensembleNamePlaceholder')}
                    value={ensembleName}
                    onChange={(e) => setEnsembleName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full text-sm bg-transparent"
                  onClick={handleSave}
                  disabled={!ensembleName.trim()}
                >
                  {t('organisms.ensembleSidebar.saveButton')}
                </Button>
              </div>

              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <Text variant="caption" className="text-primary">
                    {t('organisms.ensembleSidebar.saveInfoText')}
                  </Text>
                </div>
              </div>
            </div>
          )}

          {/* Manual Responses */}
          <div>
            <Heading level={4} size="sm" className="mb-2">{t('organisms.ensembleSidebar.manualResponses')}</Heading>
            <Text variant="caption" color="muted" className="mb-3">
              {t('organisms.ensembleSidebar.manualResponsesDescription')}
            </Text>
            <Text variant="caption" className="text-muted-foreground mb-3">
              {t('organisms.ensembleSidebar.manualResponsesInfo')}
            </Text>
            {manualResponses.length > 0 && (
              <div className="mb-3 space-y-2" data-testid="manual-responses-list">
                {manualResponses.map((manual) => (
                  <div
                    key={manual.id}
                    className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
                  >
                    <div className="font-medium text-foreground">{manual.label}</div>
                    {manual.response && (
                      <p className="mt-1 text-muted-foreground line-clamp-3">{manual.response}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full text-sm bg-transparent"
              onClick={onAddManualResponse}
              data-testid="add-manual-response"
            >
              {t('organisms.ensembleSidebar.addManualResponse')}
            </Button>

            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <Text variant="caption" className="text-primary">
                  {t('organisms.ensembleSidebar.manualResponsesNote')}
                </Text>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

EnsembleSidebar.displayName = 'EnsembleSidebar';
