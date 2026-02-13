import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { Trash2 } from 'lucide-react';
import type { Preset } from './EnsembleSidebar';

export interface QuickPresetsSectionProps {
  presets: Preset[];
  showDeleteButtons: boolean;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
}

export function QuickPresetsSection({
  presets,
  showDeleteButtons,
  onLoadPreset,
  onDeletePreset,
}: QuickPresetsSectionProps) {
  const { t } = useTranslation();
  return (
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
  );
}
