import { AgreementSummary, agreementLevel, type AgreementSummaryProps } from '../../molecules/AgreementSummary';
import { ConsensusAnswer, type ConsensusAnswerProps } from '../../molecules/ConsensusAnswer';
import { cn } from '../../../lib/utils';

export interface ConsensusPanelProps {
  /** Agreement score, level, calibration and pair scores. */
  agreement: AgreementSummaryProps;
  /** Consensus answer, method, majority vote and cost. */
  consensus: ConsensusAnswerProps;
  className?: string;
}

/**
 * ConsensusPanel organism: the result of a run, above the individual
 * answers. The agreement score (with its calibrated or uncalibrated label)
 * sits next to the consensus answer, its majority vote breakdown and the
 * cost summary. Stacked on small screens, side by side from 1024 px.
 *
 * @example
 * ```tsx
 * <ConsensusPanel agreement={{ status: 'ready', score: 0.86, pairs }}
 *   consensus={{ status: 'success', text, method: 'standard', cost }} />
 * ```
 */
export function ConsensusPanel({ agreement, consensus, className }: ConsensusPanelProps) {
  const level = agreement.status === 'ready' ? agreementLevel(agreement.score ?? 0, agreement.thresholds) : undefined;
  return (
    <div
      data-testid="consensus-panel"
      data-level={level}
      className={cn('grid items-stretch gap-4 lg:grid-cols-[minmax(17.5rem,1fr)_2fr]', className)}
    >
      <AgreementSummary {...agreement} />
      <ConsensusAnswer {...consensus} />
    </div>
  );
}
