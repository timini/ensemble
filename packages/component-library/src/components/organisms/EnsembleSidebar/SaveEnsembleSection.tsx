import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { Info } from 'lucide-react';

export interface SaveEnsembleSectionProps {
  currentEnsembleName: string;
  onSavePreset: (name: string) => void;
}

export function SaveEnsembleSection({
  currentEnsembleName,
  onSavePreset,
}: SaveEnsembleSectionProps) {
  const { t } = useTranslation();
  const [ensembleName, setEnsembleName] = React.useState(currentEnsembleName);

  React.useEffect(() => {
    setEnsembleName(currentEnsembleName);
  }, [currentEnsembleName]);

  const handleSave = () => {
    if (ensembleName.trim()) {
      onSavePreset(ensembleName.trim());
    }
  };

  return (
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
  );
}
