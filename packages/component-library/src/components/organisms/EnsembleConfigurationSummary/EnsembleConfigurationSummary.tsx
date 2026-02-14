import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';
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
  consensusMethod?: 'standard' | 'elo' | 'majority';
  topN?: number;
  onConsensusMethodChange?: (method: 'standard' | 'elo' | 'majority') => void;
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
              <div className="border-t pt-4">
                <Heading level={4} size="sm" className="mb-3">Consensus Preset</Heading>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start gap-6">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="consensusMethod"
                        checked={consensusMethod === 'standard'}
                        onChange={() => onConsensusMethodChange('standard')}
                        className="w-4 h-4 text-primary accent-primary"
                        data-testid="preset-standard"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium">Standard Summarisation</span>
                        <span className="block text-xs text-muted-foreground">
                          Synthesise all selected model responses equally.
                        </span>
                      </span>
                    </label>

                    <label className={`flex items-start gap-2 ${selectedModels.length < 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="consensusMethod"
                        checked={consensusMethod === 'elo'}
                        onChange={() => onConsensusMethodChange('elo')}
                        disabled={selectedModels.length < 3}
                        className="w-4 h-4 text-primary accent-primary disabled:opacity-50"
                        data-testid="preset-elo"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium">ELO Ranked Summarisation</span>
                        <span className="block text-xs text-muted-foreground">
                          Pairwise ranking with Top N synthesis. Requires at least 3 models.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="consensusMethod"
                        checked={consensusMethod === 'majority'}
                        onChange={() => onConsensusMethodChange('majority')}
                        className="w-4 h-4 text-primary accent-primary"
                        data-testid="preset-majority"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium">Majority Voting</span>
                        <span className="block text-xs text-muted-foreground">
                          Favors the majority position across responses. Works with 2+ models.
                        </span>
                      </span>
                    </label>

                    {consensusMethod === 'elo' && onTopNChange && (
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-muted-foreground">Top N:</span>
                        <input
                          type="number"
                          min={3}
                          max={selectedModels.length}
                          value={topN}
                          onChange={(e) => onTopNChange(parseInt(e.target.value) || 3)}
                          className="w-16 p-1 border border-input bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          data-testid="input-top-n"
                        />
                      </div>
                    )}
                  </div>

                  {selectedModels.length < 3 && (
                    <p className="text-xs text-warning flex items-center gap-1">
                      <span>ℹ️</span>
                      ELO Ranked Summarisation requires at least 3 models selected ({selectedModels.length} selected)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

EnsembleConfigurationSummary.displayName = 'EnsembleConfigurationSummary';
