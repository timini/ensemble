import * as React from 'react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus/types';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';
import { ConsensusPresetSelector } from '../../molecules/ConsensusPresetSelector';
import { cn } from '../../../lib/utils';

export interface EnsembleConfigurationSummaryProps {
  /** List of selected model IDs */
  selectedModels: string[];
  /** ID of the summarizer model */
  summarizerModel: string;
  /** Optional heading text (defaults to "Your Ensemble Configuration") */
  heading?: string;
  /** Optional description text */
  description?: string;
  /** Arguments for Consensus Mode */
  consensusMethod?: ConsensusMethod;
  topN?: number;
  onConsensusMethodChange?: (method: ConsensusMethod) => void;
  onTopNChange?: (n: number) => void;
  /** Optional callback when user clicks a model to set it as summarizer */
  onSummarizerChange?: (modelId: string) => void;
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
      consensusMethod = 'standard',
      topN = 3,
      onConsensusMethodChange,
      onTopNChange,
      onSummarizerChange,
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
          <p className="text-sm text-muted-foreground mb-4">
            {description || t('organisms.ensembleConfigurationSummary.description')}
          </p>

          <div className="flex flex-col gap-6">
            {/* Models and Summarizer Row */}
            <div className="flex items-start justify-between">
              <div>
                <Heading level={4} size="sm" className="mb-2">
                  {t('organisms.ensembleConfigurationSummary.selectedModels', { count: selectedModels.length })}
                </Heading>
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map((model, index) => {
                    const isSummarizer = model === summarizerModel;
                    const badge = (
                      <Badge
                        variant="outline"
                        className={cn(
                          'bg-muted',
                          onSummarizerChange && !isSummarizer && 'cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all',
                          onSummarizerChange && isSummarizer && 'ring-2 ring-primary/20',
                        )}
                        data-testid={`selected-model-${index}`}
                      >
                        {model}
                      </Badge>
                    );

                    if (onSummarizerChange) {
                      return (
                        <button
                          key={index}
                          onClick={() => onSummarizerChange(model)}
                          className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
                          aria-label={t('organisms.ensembleConfigurationSummary.setSummarizer', { model })}
                          type="button"
                        >
                          {badge}
                        </button>
                      );
                    }

                    return <React.Fragment key={index}>{badge}</React.Fragment>;
                  })}
                </div>
              </div>

              <div>
                <Heading level={4} size="sm" className="mb-2">{t('organisms.ensembleConfigurationSummary.summarizer')}</Heading>
                <Badge
                  className="bg-primary/10 text-primary border-primary/30"
                  data-testid="summarizer-model"
                >
                  {summarizerModel}
                </Badge>
              </div>
            </div>

            {/* Consensus Presets Row */}
            {onConsensusMethodChange && (
              <ConsensusPresetSelector
                selectedModelCount={selectedModels.length}
                consensusMethod={consensusMethod}
                topN={topN}
                onConsensusMethodChange={onConsensusMethodChange}
                onTopNChange={onTopNChange}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

EnsembleConfigurationSummary.displayName = 'EnsembleConfigurationSummary';
