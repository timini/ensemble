import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

export interface AccuracyIntervalProps {
  /** Share of questions answered correctly (0 to 1). */
  accuracy: number;
  /** Lower bound of the 95% interval (0 to 1). */
  lower: number;
  /** Upper bound of the 95% interval (0 to 1). */
  upper: number;
  /** Draw with the primary colour, for example for the best single model. */
  highlighted?: boolean;
  className?: string;
}

const pct = (value: number) => (Math.min(1, Math.max(0, value)) * 100).toFixed(1);

/**
 * AccuracyInterval molecule: an accuracy in percent with its 95% confidence
 * interval, as text and as a band with a point on a 0 to 100% track. Used on
 * the benchmarks page so no accuracy is shown without its uncertainty.
 *
 * @example
 * ```tsx
 * <AccuracyInterval accuracy={0.72} lower={0.654} upper={0.777} />
 * ```
 */
export const AccuracyInterval = React.forwardRef<HTMLDivElement, AccuracyIntervalProps>(
  ({ accuracy, lower, upper, highlighted = false, className }, ref) => {
    const { t } = useTranslation();
    const value = pct(accuracy);
    const low = pct(lower);
    const high = pct(upper);

    return (
      <div
        ref={ref}
        data-testid="accuracy-interval"
        data-highlighted={highlighted ? 'true' : 'false'}
        className={cn('flex min-w-[10rem] flex-col gap-1', className)}
      >
        <div className="flex items-baseline gap-2">
          <span
            data-testid="accuracy-interval-value"
            className={cn('font-semibold tabular-nums', highlighted ? 'text-primary' : 'text-foreground')}
          >
            {value}%
          </span>
          <span data-testid="accuracy-interval-range" className="text-xs tabular-nums text-muted-foreground">
            {t('molecules.accuracyInterval.range', { lower: low, upper: high })}
          </span>
        </div>
        <div
          role="img"
          aria-label={t('molecules.accuracyInterval.label', { value, lower: low, upper: high })}
          className="relative h-2 w-full rounded-full bg-muted"
        >
          <div
            data-testid="accuracy-interval-band"
            className={cn('absolute top-0 h-2 rounded-full', highlighted ? 'bg-primary/40' : 'bg-muted-foreground/30')}
            style={{ left: `${Number(low)}%`, width: `${Number(high) - Number(low)}%` }}
          />
          <div
            data-testid="accuracy-interval-point"
            className={cn(
              'absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm',
              highlighted ? 'bg-primary' : 'bg-foreground',
            )}
            style={{ left: `${Number(value)}%` }}
          />
        </div>
      </div>
    );
  },
);

AccuracyInterval.displayName = 'AccuracyInterval';
