import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { Info } from 'lucide-react';

export interface ManualResponsesSectionProps {
  manualResponses: Array<{ id: string; label: string; response?: string }>;
  onAddManualResponse: () => void;
}

export function ManualResponsesSection({
  manualResponses,
  onAddManualResponse,
}: ManualResponsesSectionProps) {
  const { t } = useTranslation();
  return (
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
  );
}
