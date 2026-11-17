import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import { cn } from '../../../lib/utils';

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

/** Format a USD amount: two significant digits below one dollar, cents above. */
export function formatUsd(value: number, locale: string): string {
  const small = value > 0 && value < 1;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    ...(small
      ? { maximumSignificantDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }).format(value);
}

/**
 * RunCostSummary molecule shows the model calls and cost of a run.
 *
 * - `estimate`: before a run, the number of calls by kind and a cost range.
 * - `actual`: after a run, the cost from the token counts the providers
 *   reported, labelled as estimated when some counts came from text length.
 *
 * @example
 * ```tsx
 * <RunCostSummary variant="estimate" calls={calls} consensusAvailable lowUsd={0.1} highUsd={1.2} />
 * <RunCostSummary variant="actual" callCount={7} totalUsd={0.04} estimated={false} />
 * ```
 */
export const RunCostSummary = React.forwardRef<HTMLDivElement, RunCostSummaryProps>(
  (props, ref) => {
    const { t, i18n } = useTranslation();
    const usd = (value: number) => formatUsd(value, i18n.language || 'en');
    const isEstimate = props.variant === 'estimate';
    const unpriced = props.unpricedModels ?? [];

    let calls: number;
    let amount: string;
    if (props.variant === 'estimate') {
      calls = props.calls.total;
      amount = t('molecules.runCostSummary.estimatedRange', {
        low: usd(props.lowUsd),
        high: usd(props.highUsd),
      });
    } else {
      calls = props.callCount;
      amount = t(
        props.estimated
          ? 'molecules.runCostSummary.actualEstimated'
          : 'molecules.runCostSummary.actual',
        { cost: usd(props.totalUsd) },
      );
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
                answers: props.calls.answers,
                consensus:
                  props.calls.consensusMin < props.calls.consensus
                    ? t('molecules.runCostSummary.range', {
                        min: props.calls.consensusMin,
                        max: props.calls.consensus,
                      })
                    : props.calls.consensus,
                embeddings: props.calls.embeddings,
              })}
            </Text>
          )}
          {props.variant === 'estimate' && !props.consensusAvailable && (
            <Text as="p" className="text-sm text-warning" data-testid="run-cost-consensus-unavailable">
              {t('molecules.runCostSummary.consensusUnavailable')}
            </Text>
          )}
          {props.variant === 'actual' && props.estimated && (
            <Text as="p" className="text-sm text-muted-foreground" data-testid="run-cost-estimated-note">
              {t('molecules.runCostSummary.estimatedNote')}
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
