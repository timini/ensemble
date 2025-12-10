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
  /** Arguments for Consensus Mode */
  consensusMethod?: 'standard' | 'elo';
  topN?: number;
  onConsensusMethodChange?: (method: 'standard' | 'elo') => void;
  onTopNChange?: (n: number) => void;
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

          <div className="flex flex-col gap-6">
            {/* Models and Summarizer Row */}
            <div className="flex items-start justify-between">
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

            {/* Consensus Presets Row */}
            {onConsensusMethodChange && (
              <div className="border-t pt-4">
                <Heading level={4} size="sm" className="mb-3">Consensus Preset</Heading>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="consensusMethod"
                        checked={consensusMethod === 'standard'}
                        onChange={() => onConsensusMethodChange('standard')}
                        className="w-4 h-4 text-blue-600"
                        data-testid="preset-standard"
                      />
                      <span className="text-sm font-medium">Standard Summarisation</span>
                    </label>

                    <label className={`flex items-center gap-2 ${selectedModels.length < 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="consensusMethod"
                        checked={consensusMethod === 'elo'}
                        onChange={() => onConsensusMethodChange('elo')}
                        disabled={selectedModels.length < 3}
                        className="w-4 h-4 text-blue-600 disabled:opacity-50"
                        data-testid="preset-elo"
                      />
                      <span className="text-sm font-medium">ELO Ranked Summarisation</span>
                    </label>

                    {consensusMethod === 'elo' && onTopNChange && (
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-600">Top N:</span>
                        <input
                          type="number"
                          min={3}
                          max={selectedModels.length}
                          value={topN}
                          onChange={(e) => onTopNChange(parseInt(e.target.value) || 3)}
                          className="w-16 p-1 border rounded text-sm"
                          data-testid="input-top-n"
                        />
                      </div>
                    )}
                  </div>

                  {selectedModels.length < 3 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
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
