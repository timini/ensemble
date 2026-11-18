import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../atoms/Badge';
import { Card, CardContent } from '../../atoms/Card';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { AccuracyInterval } from '../../molecules/AccuracyInterval';
import { formatUsd } from '../../molecules/RunCostSummary/runCostFormat';
import { cn } from '../../../lib/utils';

/** One configuration's result on one dataset. */
export interface BenchmarkResultRow {
  /** Stable id (`single:qwen`, `ensemble:majority`, `reference`). */
  id: string;
  kind: 'single' | 'ensemble' | 'reference';
  /** Display name, already translated where needed. */
  label: string;
  accuracy: number;
  ciLower: number;
  ciUpper: number;
  /** Paired McNemar p-value against the best single model, or null when not tested. */
  pValue: number | null;
  /** True for the best single open model, which the others are tested against. */
  isBest: boolean;
  costUsd: number;
  /** Some calls had no price, so the cost is a lower bound. */
  costIncomplete: boolean;
  /** Calls that failed or timed out (counted wrong). */
  failures: number;
}

export interface BenchmarkResultsTableProps {
  /** Dataset name (`GSM8K`). */
  title: string;
  /** Questions in the dataset sample. */
  n: number;
  rows: BenchmarkResultRow[];
  className?: string;
}

const formatP = (p: number) => (p < 0.001 ? '<0.001' : p.toFixed(3));

/**
 * BenchmarkResultsTable organism: the results of one benchmark dataset, one
 * line per configuration (single models, ensembles, the reference) with
 * accuracy and its 95% interval, the McNemar p-value against the best
 * single model, and the cost.
 *
 * @example
 * ```tsx
 * <BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />
 * ```
 */
export const BenchmarkResultsTable = React.forwardRef<HTMLDivElement, BenchmarkResultsTableProps>(
  ({ title, n, rows, className }, ref) => {
    const { t, i18n } = useTranslation();
    const usd = (value: number) => formatUsd(value, i18n.language || 'en');
    const k = (key: string) => `organisms.benchmarkResultsTable.${key}`;

    const pCell = (row: BenchmarkResultRow) => {
      if (row.isBest) return t(k('best'));
      return row.pValue === null ? t(k('notTested')) : formatP(row.pValue);
    };

    return (
      <Card ref={ref} data-testid="benchmark-results-table" className={className}>
        <CardContent className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <Heading level={3} size="lg" data-testid="benchmark-results-title">{title}</Heading>
            <Text variant="small" color="muted" data-testid="benchmark-results-n">
              {t(k('questions'), { count: n })}
            </Text>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t(k('configuration'))}</th>
                  <th className="py-2 pr-4 font-medium">{t(k('accuracy'))}</th>
                  <th className="py-2 pr-4 font-medium">{t(k('pValue'))}</th>
                  <th className="py-2 font-medium">{t(k('cost'))}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="benchmark-result-row"
                    data-config-id={row.id}
                    data-best={row.isBest ? 'true' : 'false'}
                    className={cn('border-b border-border last:border-0', row.isBest && 'bg-primary/5')}
                  >
                    <td className="py-3 pr-4 align-top">
                      <div className="font-medium text-foreground">{row.label}</div>
                      <Badge variant={row.kind === 'ensemble' ? 'default' : 'outline'} className="mt-1" data-testid="benchmark-result-kind">
                        {t(k(`kind.${row.kind}`))}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <AccuracyInterval accuracy={row.accuracy} lower={row.ciLower} upper={row.ciUpper} highlighted={row.isBest} />
                    </td>
                    <td className="py-3 pr-4 align-top tabular-nums" data-testid="benchmark-result-p">
                      {pCell(row)}
                    </td>
                    <td className="py-3 align-top tabular-nums">
                      <div data-testid="benchmark-result-cost">
                        {row.costIncomplete
                          ? t(k('costLowerBound'), { cost: usd(row.costUsd) })
                          : usd(row.costUsd)}
                      </div>
                      {row.failures > 0 && (
                        <div className="text-xs text-muted-foreground" data-testid="benchmark-result-failures">
                          {t(k('failures'), { count: row.failures })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  },
);

BenchmarkResultsTable.displayName = 'BenchmarkResultsTable';
