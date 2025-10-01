import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { Info, Trash2 } from 'lucide-react';

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
          <Text variant="helper" className="text-gray-600 mb-6">
            {t('organisms.ensembleSidebar.description')}
          </Text>

          {/* Selected Models */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Heading level={4} size="sm" className="mb-0">
                {t('organisms.ensembleSidebar.selectedModels', { count: selectedModels.length })}
              </Heading>
              {summarizerId && <Text as="span" variant="small" color="primary">{t('organisms.ensembleSidebar.summarizerLabel')}</Text>}
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
                        className="text-xs bg-blue-50 text-blue-600 border-blue-200"
                      >
                        {model.name}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-6">
            <Heading level={4} size="sm" className="mb-3">{t('organisms.ensembleSidebar.quickPresets')}</Heading>
            <Text variant="caption" color="muted" className="mb-4">
              {t('organisms.ensembleSidebar.quickPresetsDescription')}
            </Text>

            {presets.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                {t('organisms.ensembleSidebar.noPresets')}
              </div>
            ) : (
              <div className="space-y-3">
                {presets.map((preset) => (
                  <div key={preset.id} className="border rounded-lg p-3 relative">
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
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDeletePreset(preset.id)}
                            aria-label={t('organisms.ensembleSidebar.deletePreset', { name: preset.name })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Text variant="caption" className="text-gray-600 mb-2">{preset.description}</Text>
                    <Text variant="caption" color="muted">{t('organisms.ensembleSidebar.summarizerInfo', { name: preset.summarizerName })}</Text>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Current Ensemble */}
          <div className="mb-6">
            <Heading level={4} size="sm" className="mb-3">{t('organisms.ensembleSidebar.saveCurrentEnsemble')}</Heading>
            <Text variant="caption" color="muted" className="mb-3">{t('organisms.ensembleSidebar.saveDescription')}</Text>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">{t('organisms.ensembleSidebar.ensembleNameLabel')}</label>
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

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <Text variant="caption" className="text-blue-700">
                  {t('organisms.ensembleSidebar.saveInfoText')}
                </Text>
              </div>
            </div>
          </div>

          {/* Manual Responses */}
          <div>
            <Heading level={4} size="sm" className="mb-2">{t('organisms.ensembleSidebar.manualResponses')}</Heading>
            <Text variant="caption" color="muted" className="mb-3">
              {t('organisms.ensembleSidebar.manualResponsesDescription')}
            </Text>
            <Text variant="caption" className="text-gray-600 mb-3">
              {t('organisms.ensembleSidebar.manualResponsesInfo')}
            </Text>
            <Button
              variant="outline"
              className="w-full text-sm bg-transparent"
              onClick={onAddManualResponse}
            >
              {t('organisms.ensembleSidebar.addManualResponse')}
            </Button>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <Text variant="caption" className="text-blue-700">
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
