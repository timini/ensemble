import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { Info, Trash2 } from 'lucide-react';

export interface Preset {
  id: string;
  name: string;
  description: string;
  modelIds: string[];
  summarizerId: string;
  summarizerName: string;
}

export interface EnsembleManagementPanelProps {
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
}

/**
 * EnsembleManagementPanel organism for managing ensemble presets.
 *
 * Composes Button and Input atoms to create a panel for saving, loading, and
 * deleting ensemble configurations. Supports quick preset loading and custom
 * ensemble saving.
 *
 * @example
 * ```tsx
 * <EnsembleManagementPanel
 *   presets={savedPresets}
 *   currentEnsembleName="My Ensemble"
 *   onLoadPreset={(id) => loadPreset(id)}
 *   onSavePreset={(name) => saveEnsemble(name)}
 *   onDeletePreset={(id) => deletePreset(id)}
 * />
 * ```
 */
export const EnsembleManagementPanel = React.forwardRef<
  HTMLDivElement,
  EnsembleManagementPanelProps
>(
  (
    {
      presets,
      currentEnsembleName,
      showDeleteButtons = false,
      onLoadPreset,
      onSavePreset,
      onDeletePreset,
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
      <div ref={ref} data-testid="ensemble-management-panel">
        {/* Quick Presets */}
        <div className="mb-6">
          <Heading level={4} size="sm" className="mb-3">{t('organisms.ensembleManagementPanel.quickPresets')}</Heading>
          <Text variant="caption" color="muted" className="mb-4">
            {t('organisms.ensembleManagementPanel.quickPresetsDescription')}
          </Text>

          {presets.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {t('organisms.ensembleManagementPanel.noPresets')}
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
                        {t('organisms.ensembleManagementPanel.usePreset')}
                      </Button>
                      {showDeleteButtons && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeletePreset(preset.id)}
                          aria-label={t('organisms.ensembleManagementPanel.deletePreset', { name: preset.name })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Text variant="caption" className="text-muted-foreground mb-2">{preset.description}</Text>
                  <Text variant="caption" color="muted">{t('organisms.ensembleManagementPanel.summarizerLabel', { name: preset.summarizerName })}</Text>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Current Ensemble */}
        <div className="mb-6">
          <Heading level={4} size="sm" className="mb-3">{t('organisms.ensembleManagementPanel.saveCurrentEnsemble')}</Heading>
          <Text variant="caption" color="muted" className="mb-3">{t('organisms.ensembleManagementPanel.saveDescription')}</Text>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('organisms.ensembleManagementPanel.ensembleNameLabel')}</label>
              <Input
                placeholder={t('organisms.ensembleManagementPanel.ensembleNamePlaceholder')}
                value={ensembleName}
                onChange={(e) => setEnsembleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              variant="outline"
              className="w-full text-sm bg-transparent"
              onClick={handleSave}
            >
              {t('organisms.ensembleManagementPanel.saveButton')}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <Text variant="caption" className="text-primary">
                {t('organisms.ensembleManagementPanel.saveInfoText')}
              </Text>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

EnsembleManagementPanel.displayName = 'EnsembleManagementPanel';
