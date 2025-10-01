import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';

export interface EnsembleConfigurationSummaryProps {
  /** List of selected model IDs */
  selectedModels: string[];
  /** ID of the summarizer model */
  summarizerModel: string;
  /** Optional heading text (defaults to "Your Ensemble Configuration") */
  heading?: string;
  /** Optional description text */
  description?: string;
}

/**
 * EnsembleConfigurationSummary organism for displaying ensemble setup.
 *
 * Shows selected models and summarizer model in a card format.
 * Matches the wireframe design from prompt page.
 *
 * @example
 * ```tsx
 * <EnsembleConfigurationSummary
 *   selectedModels={['claude-3-haiku-20240307', 'claude-3-opus-20240229']}
 *   summarizerModel="claude-3-opus-20240229"
 * />
 * ```
 */
export const EnsembleConfigurationSummary = React.forwardRef<
  HTMLDivElement,
  EnsembleConfigurationSummaryProps
>(
  (
    {
      selectedModels,
      summarizerModel,
      heading,
      description,
    },
    ref
  ) => {
    const { t } = useTranslation();

    return (
      <Card ref={ref} data-testid="ensemble-configuration-summary">
        <CardContent className="p-6">
          <Heading level={3} size="lg" className="mb-4">
            {heading || t('organisms.ensembleConfigurationSummary.heading')}
          </Heading>
          <p className="text-sm text-gray-600 mb-4">
            {description || t('organisms.ensembleConfigurationSummary.description')}
          </p>

          <div className="flex items-center justify-between">
            <div>
              <Heading level={4} size="sm" className="mb-2">
                {t('organisms.ensembleConfigurationSummary.selectedModels', { count: selectedModels.length })}
              </Heading>
              <div className="flex flex-wrap gap-2">
                {selectedModels.map((model, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-gray-50"
                    data-testid={`selected-model-${index}`}
                  >
                    {model}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Heading level={4} size="sm" className="mb-2">{t('organisms.ensembleConfigurationSummary.summarizer')}</Heading>
              <Badge
                className="bg-blue-100 text-blue-800 border-blue-200"
                data-testid="summarizer-model"
              >
                {summarizerModel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

EnsembleConfigurationSummary.displayName = 'EnsembleConfigurationSummary';
