import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus/types';
import { useTranslation } from 'react-i18next';
import { Heading } from '../../atoms/Heading';

export interface ConsensusPresetSelectorProps {
  /** Number of currently selected models in the ensemble. */
  selectedModelCount: number;
  /** Active consensus method. */
  consensusMethod: ConsensusMethod;
  /** Optional Top N value used by ELO mode (defaults to 3). */
  topN?: number;
  /** Called when the user selects a consensus method. */
  onConsensusMethodChange: (method: ConsensusMethod) => void;
  /** Called when the user changes the Top N value in ELO mode. */
  onTopNChange?: (n: number) => void;
}

/**
 * Selector for choosing the consensus preset used during response synthesis.
 *
 * Renders standard, ELO, and majority methods, and conditionally shows
 * ELO-specific Top N controls when applicable.
 *
 * @example
 * ```tsx
 * <ConsensusPresetSelector
 *   selectedModelCount={4}
 *   consensusMethod="standard"
 *   onConsensusMethodChange={setConsensusMethod}
 *   onTopNChange={setTopN}
 * />
 * ```
 */
export function ConsensusPresetSelector({
  selectedModelCount,
  consensusMethod,
  topN = 3,
  onConsensusMethodChange,
  onTopNChange,
}: ConsensusPresetSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4">
      <Heading level={4} size="sm" className="mb-3">
        {t('organisms.ensembleConfigurationSummary.consensusPreset.heading')}
      </Heading>

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
              <span className="block text-sm font-medium">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.standard.title')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.standard.description')}
              </span>
            </span>
          </label>

          <label className={`flex items-start gap-2 ${selectedModelCount < 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name="consensusMethod"
              checked={consensusMethod === 'elo'}
              onChange={() => onConsensusMethodChange('elo')}
              disabled={selectedModelCount < 3}
              className="w-4 h-4 text-primary accent-primary disabled:opacity-50"
              data-testid="preset-elo"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.elo.title')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.elo.description')}
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
              <span className="block text-sm font-medium">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.majority.title')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.majority.description')}
              </span>
            </span>
          </label>

          {consensusMethod === 'elo' && onTopNChange && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">
                {t('organisms.ensembleConfigurationSummary.consensusPreset.topN')}
              </span>
              <input
                type="number"
                min={3}
                max={selectedModelCount}
                value={topN}
                onChange={(e) => onTopNChange(Number.parseInt(e.target.value, 10) || 3)}
                className="w-16 p-1 border border-input bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-top-n"
              />
            </div>
          )}
        </div>

        {selectedModelCount < 3 && (
          <p
            className="text-xs text-warning flex items-center gap-1"
            data-testid="preset-elo-warning"
          >
            <span>ℹ️</span>
            {t('organisms.ensembleConfigurationSummary.consensusPreset.elo.warning', {
              count: selectedModelCount,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
