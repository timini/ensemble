import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import { cn } from '../../../lib/utils';
import { coverageOf, formatUsd } from './runCostFormat';

export { formatUsd };

/** Call counts of a planned run. */
export interface RunCostCalls {
  answers: number;
  /** Consensus calls when every step runs. */
  consensus: number;
  /** Fewest consensus calls (council skips ranking calls for rejected branches). */
  consensusMin: number;
  embeddings: number;
  total: number;
}

interface CommonProps {
  /** `provider/model` ids with no price; their calls are left out of the cost. */
  unpricedModels?: string[];
  /** Calls with a price, counted in the cost. */
  pricedCallCount: number;
  /**
   * Calls with no price. When above zero the cost is shown as a lower bound,
   * or as unknown when no call has a price.
   */
  unpricedCallCount: number;
  /** Priced calls to local models. When above zero, a note says they cost nothing. */
  localCallCount?: number;
  /** Date of the price table, shown as the source of the prices. */
  priceDate?: string;
  className?: string;
}

export interface RunCostEstimateProps extends CommonProps {
  variant: 'estimate';
  calls: RunCostCalls;
  /** False when the consensus method needs more answers than the run will have. */
  consensusAvailable: boolean;
  lowUsd: number;
  highUsd: number;
}

export interface RunCostActualProps extends CommonProps {
  variant: 'actual';
  callCount: number;
  totalUsd: number;
  /** True when some token counts were estimated from text length. */
  estimated: boolean;
}

export type RunCostSummaryProps = RunCostEstimateProps | RunCostActualProps;

/**
 * RunCostSummary molecule shows the model calls and cost of a run.
 *
 * - `estimate`: before a run, the number of calls by kind and a cost range.
 * - `actual`: after a run, the cost from the token counts the providers
 *   reported, labelled as estimated when some counts came from text length.
 *
 * Calls with no price are never shown as free: when some calls have no
 * price the cost is a lower bound, and when none has a price it is unknown.
 *
 * @example
 * ```tsx
 * <RunCostSummary variant="estimate" calls={calls} consensusAvailable lowUsd={0.1} highUsd={1.2}
 *   pricedCallCount={7} unpricedCallCount={0} />
 * <RunCostSummary variant="actual" callCount={7} totalUsd={0.04} estimated={false}
 *   pricedCallCount={7} unpricedCallCount={0} />
 * ```
 */
export const RunCostSummary = React.forwardRef<HTMLDivElement, RunCostSummaryProps>(
  (props, ref) => {
    const { t, i18n } = useTranslation();
    const usd = (value: number) => formatUsd(value, i18n.language || 'en');
    const isEstimate = props.variant === 'estimate';
    const unpriced = props.unpricedModels ?? [];
    const coverage = coverageOf(props.pricedCallCount, props.unpricedCallCount);

    let calls: number;
    let amount: string;
    if (props.variant === 'estimate') {
      calls = props.calls.total;
      amount =
        coverage === 'none'
          ? t('molecules.runCostSummary.estimatedUnknown')
          : t(
              coverage === 'partial'
                ? 'molecules.runCostSummary.estimatedRangePartial'
                : 'molecules.runCostSummary.estimatedRange',
              { low: usd(props.lowUsd), high: usd(props.highUsd) },
            );
    } else {
      calls = props.callCount;
      const key = {
        all: props.estimated ? 'actualEstimated' : 'actual',
        partial: props.estimated ? 'actualEstimatedPartial' : 'actualPartial',
        none: 'actualUnknown',
      }[coverage];
      amount = t(`molecules.runCostSummary.${key}`, { cost: usd(props.totalUsd) });
    }

    return (
      <div
        ref={ref}
        data-testid="run-cost-summary"
        data-variant={props.variant}
        className={cn('flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3', props.className)}
      >
        <Icon className="mt-0.5 text-muted-foreground">
          <Coins />
        </Icon>
        <div className="space-y-1">
          <Text as="p" className="font-medium text-foreground">
            <span data-testid="run-cost-calls">
              {t('molecules.runCostSummary.calls', { count: calls })}
            </span>
            {' · '}
            <span data-testid="run-cost-amount">{amount}</span>
          </Text>
          {props.variant === 'estimate' && (
            <Text as="p" className="text-sm text-muted-foreground" data-testid="run-cost-breakdown">
              {t('molecules.runCostSummary.breakdown', {
                answers: t('molecules.runCostSummary.answers', { count: props.calls.answers }),
                consensus: t('molecules.runCostSummary.consensusCalls', {
                  count: props.calls.consensus,
                  value:
                    props.calls.consensusMin < props.calls.consensus
                      ? t('molecules.runCostSummary.range', {
                          min: props.calls.consensusMin,
                          max: props.calls.consensus,
                        })
                      : props.calls.consensus,
                }),
                embeddings: t('molecules.runCostSummary.embeddingCalls', {
                  count: props.calls.embeddings,
                }),
              })}
            </Text>
          )}
          {props.variant === 'estimate' && !props.consensusAvailable && (
            <Text as="p" className="text-sm text-warning" data-testid="run-cost-consensus-unavailable">
              {t('molecules.runCostSummary.consensusUnavailable')}
            </Text>
          )}
          {props.variant === 'actual' && props.estimated && coverage !== 'none' && (
            <Text as="p" className="text-sm text-muted-foreground" data-testid="run-cost-estimated-note">
              {t('molecules.runCostSummary.estimatedNote')}
            </Text>
          )}
          {(props.localCallCount ?? 0) > 0 && (
            <Text as="p" className="text-sm text-muted-foreground" data-testid="run-cost-local">
              {t('molecules.runCostSummary.local', { count: props.localCallCount })}
            </Text>
          )}
          {unpriced.length > 0 && (
            <Text as="p" className="text-sm text-muted-foreground" data-testid="run-cost-unpriced">
              {t('molecules.runCostSummary.unpriced', { models: unpriced.join(', ') })}
            </Text>
          )}
          {props.priceDate && (
            <Text as="p" className="text-xs text-muted-foreground" data-testid="run-cost-price-source">
              {t(
                isEstimate
                  ? 'molecules.runCostSummary.estimateSource'
                  : 'molecules.runCostSummary.priceSource',
                { date: props.priceDate },
              )}
            </Text>
          )}
        </div>
      </div>
    );
  },
);

RunCostSummary.displayName = 'RunCostSummary';
