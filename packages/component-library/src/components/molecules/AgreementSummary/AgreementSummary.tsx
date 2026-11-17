import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { AgreementRing, type AgreementLevel } from '../../atoms/AgreementRing';
import { Badge } from '../../atoms/Badge';
import {
  DEFAULT_LEVEL_THRESHOLDS,
  type AgreementCalibrationInfo,
  type AgreementLevelThresholds,
} from '../../organisms/AgreementAnalysis';
import { cn } from '../../../lib/utils';

/** Similarity of two answers on the 0 to 1 scale. */
export interface AgreementPair {
  a: string;
  b: string;
  score: number;
}

export interface AgreementSummaryProps {
  /** `pending` while answers arrive, `unavailable` when no embedding model is set. */
  status: 'ready' | 'pending' | 'unavailable';
  /** Overall agreement, 0 to 1. */
  score?: number;
  pairs?: AgreementPair[];
  /** Cut-offs for the labels; defaults to the uncalibrated mapping. */
  thresholds?: AgreementLevelThresholds;
  /** Whether the thresholds were fitted for the embedding model in use. */
  calibration?: AgreementCalibrationInfo;
  /** Answers in so far, while pending. */
  progress?: { done: number; total: number };
  className?: string;
}

const TEXT: Record<AgreementLevel, string> = { high: 'text-success', medium: 'text-warning', low: 'text-destructive' };
const BAR: Record<AgreementLevel, string> = { high: 'bg-success', medium: 'bg-warning', low: 'bg-destructive' };

/** Band for a score: above `high` is high, from `medium` is medium, else low. */
export function agreementLevel(score: number, thresholds: AgreementLevelThresholds = DEFAULT_LEVEL_THRESHOLDS): AgreementLevel {
  if (score > thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

/**
 * AgreementSummary molecule: the agreement score as a ring, its level in
 * words with what that means for the user, whether the labels are calibrated
 * for the embedding model, and the score of each pair of answers. While
 * pending it shows placeholders in the same places, so it does not jump.
 *
 * @example
 * ```tsx
 * <AgreementSummary status="ready" score={0.86} pairs={pairs}
 *   calibration={{ calibrated: false, embeddingModel: 'text-embedding-3-small' }} />
 * ```
 */
export function AgreementSummary({ status, score = 0, pairs = [], thresholds, calibration, progress, className }: AgreementSummaryProps) {
  const { t } = useTranslation();
  const [showPairs, setShowPairs] = React.useState(false);
  const headingId = React.useId();
  const listId = React.useId();
  const level = agreementLevel(score, thresholds);
  const key = 'molecules.agreementSummary';
  const answers = progress?.total ?? 3;
  const pendingPairs = (answers * (answers - 1)) / 2;

  return (
    <section
      aria-labelledby={headingId}
      data-testid="agreement-summary"
      data-status={status}
      className={cn('flex flex-col rounded-2xl border border-border bg-card p-5', className)}
    >
      <h2 id={headingId} className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
        {t(`${key}.heading`)}
      </h2>

      {status === 'unavailable' && (
        <div data-testid="agreement-unavailable" className="mt-4 space-y-1">
          <p className="text-label font-medium">{t(`${key}.unavailable`)}</p>
          <p className="text-label text-muted-foreground">{t(`${key}.unavailableHint`)}</p>
        </div>
      )}

      {status === 'pending' && (
        <>
          <div className="mt-4 flex items-center gap-4">
            <AgreementRing pending />
            <p data-testid="agreement-pending" className="text-label text-muted-foreground">
              {t(`${key}.pending`)} {progress && t(`${key}.progress`, { count: progress.done, total: progress.total })}
            </p>
          </div>
          {/* Placeholders in the shape of the pair scores and calibration line, so the card keeps its height when the score arrives. */}
          <div data-testid="agreement-pending-skeleton" aria-hidden="true" className="flex flex-1 flex-col">
            {pendingPairs > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="h-5 w-2/5 rounded bg-muted lg:hidden" />
                <div className="hidden space-y-2.5 pt-1 lg:block">
                  {Array.from({ length: pendingPairs }, (_, i) => (
                    <div key={i} data-skeleton="pair" className="space-y-1">
                      <div className="h-4 w-3/5 rounded bg-muted" />
                      <div className="h-1 rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div data-testid="agreement-calibration-skeleton" className="mt-auto pt-4">
              <div className="h-5 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </>
      )}

      {status === 'ready' && (
        <>
          <div className="mt-4 flex items-center gap-4">
            <AgreementRing score={score} level={level} />
            <div className="min-w-0">
              <p data-testid="agreement-level" data-level={level} className={cn('text-heading', TEXT[level])}>
                {t(`${key}.levels.${level}.label`)}
              </p>
              <p data-testid="agreement-meaning" className="text-label text-muted-foreground">
                {t(`${key}.levels.${level}.meaning`)}
              </p>
            </div>
          </div>

          {pairs.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <button
                type="button"
                aria-expanded={showPairs}
                aria-controls={listId}
                onClick={() => setShowPairs((v) => !v)}
                className="focus-ring flex w-full items-center justify-between rounded text-label font-medium lg:hidden"
              >
                {t(`${key}.pairs`)}
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-fast', showPairs && 'rotate-180')} aria-hidden="true" />
              </button>
              <ul id={listId} className={cn('space-y-2.5 pt-3 lg:block lg:pt-1', showPairs ? 'block' : 'hidden')}>
                {pairs.map((p) => {
                  const pairLevel = agreementLevel(p.score, thresholds);
                  return (
                    <li key={`${p.a}|${p.b}`} data-testid="agreement-pair" data-level={pairLevel} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-caption">
                      <span className="truncate text-muted-foreground">{t(`${key}.pair`, { a: p.a, b: p.b })}</span>
                      <span className="tabular-nums">{p.score.toFixed(2)}</span>
                      <span className="col-span-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className={cn('block h-full rounded-full', BAR[pairLevel])} style={{ width: `${Math.round(Math.min(1, Math.max(0, p.score)) * 100)}%` }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {calibration && (
            <div data-testid="agreement-calibration" data-calibrated={String(calibration.calibrated)} className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-caption text-muted-foreground">
              {calibration.calibrated ? (
                t(`${key}.calibrated`, { model: calibration.embeddingModel ?? '' })
              ) : (
                <>
                  <Badge variant="outline">{t(`${key}.uncalibrated`)}</Badge>
                  <span>{t(`${key}.uncalibratedHint`, { model: calibration.embeddingModel ?? '' })}</span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
