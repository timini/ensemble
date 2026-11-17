import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

/** Agreement label bands, matching AgreementAnalysis. */
export type AgreementLevel = 'high' | 'medium' | 'low';

export interface AgreementRingProps {
  /** Agreement on the 0 to 1 scale. Values outside are clamped. */
  score?: number;
  /** Band the score falls in; sets the colour. */
  level?: AgreementLevel;
  /** Diameter in pixels. Defaults to 80. */
  size?: number;
  /** Answers are still arriving: an empty pulsing ring with no number. */
  pending?: boolean;
  className?: string;
}

const TONE: Record<AgreementLevel, string> = {
  high: 'text-success',
  medium: 'text-warning',
  low: 'text-destructive',
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * AgreementRing atom: the agreement score as a number out of 100 inside an
 * arc coloured by its level.
 *
 * @example
 * ```tsx
 * <AgreementRing score={0.86} level="high" />
 * ```
 */
export function AgreementRing({ score = 0, level = 'medium', size = 80, pending = false, className }: AgreementRingProps) {
  const { t } = useTranslation();
  const value = Math.min(1, Math.max(0, score));
  const percent = Math.round(value * 100);
  return (
    <div
      data-testid="agreement-ring"
      data-level={pending ? undefined : level}
      data-pending={pending ? 'true' : undefined}
      role={pending ? undefined : 'img'}
      aria-label={pending ? undefined : t('atoms.agreementRing.label', { score: percent })}
      aria-hidden={pending ? true : undefined}
      className={cn('relative shrink-0', pending && 'animate-pulse', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="8" className="stroke-muted" />
        {!pending && (
          <circle
            data-testid="agreement-ring-arc"
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={`${CIRCUMFERENCE * value} ${CIRCUMFERENCE}`}
            className={cn(TONE[level], 'transition-[stroke-dasharray] duration-slow')}
          />
        )}
      </svg>
      {!pending && (
        <span
          data-testid="agreement-ring-value"
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
          style={{ fontSize: size * 0.28 }}
        >
          {percent}
        </span>
      )}
    </div>
  );
}
