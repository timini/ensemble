import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineAlert } from '../../atoms/InlineAlert';
import { CommandSnippet } from '../../atoms/CommandSnippet';
import { Text } from '../../atoms/Text';
import { cn } from '../../../lib/utils';

/** Cost estimate of a full benchmark run. */
export interface BenchmarkRunEstimate {
  lowUsd: number;
  highUsd: number;
  calls: number;
}

export interface BenchmarksNotRunProps {
  /** Command that runs the benchmark matrix (not translated). */
  command: string;
  /** Estimate of a full run, or null when there is none. */
  estimate: BenchmarkRunEstimate | null;
  className?: string;
}

/**
 * BenchmarksNotRun molecule: the honest empty state of the benchmarks page.
 * It says that no results exist yet, what a full run would cost, and the
 * command that runs it. It never shows placeholder numbers.
 *
 * @example
 * ```tsx
 * <BenchmarksNotRun command="npm run bench:matrix --workspace=packages/eval"
 *   estimate={{ lowUsd: 2.18, highUsd: 18.27, calls: 3990 }} />
 * ```
 */
export const BenchmarksNotRun = React.forwardRef<HTMLDivElement, BenchmarksNotRunProps>(
  ({ command, estimate, className }, ref) => {
    const { t } = useTranslation();
    return (
      <div ref={ref} data-testid="benchmarks-not-run" className={cn('space-y-3', className)}>
        <InlineAlert variant="info" role="status">
          <p className="font-semibold">{t('molecules.benchmarksNotRun.title')}</p>
          <p className="mt-1">{t('molecules.benchmarksNotRun.description')}</p>
          {estimate && (
            <p className="mt-1" data-testid="benchmarks-not-run-estimate">
              {t('molecules.benchmarksNotRun.estimate', {
                low: estimate.lowUsd.toFixed(2),
                high: estimate.highUsd.toFixed(2),
                calls: estimate.calls,
              })}
            </p>
          )}
        </InlineAlert>
        <div className="space-y-1">
          <Text variant="small" color="muted">
            {t('molecules.benchmarksNotRun.commandLabel')}
          </Text>
          <CommandSnippet command={command} data-testid="benchmarks-not-run-command" />
        </div>
      </div>
    );
  },
);

BenchmarksNotRun.displayName = 'BenchmarksNotRun';
