import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '../../atoms/Button';
import { AgreementSummary, type AgreementSummaryProps } from '../../molecules/AgreementSummary';
import { ConsensusAnswer, type ConsensusAnswerProps } from '../../molecules/ConsensusAnswer';
import { AnswerColumns, type AnswerColumnItem } from '../AnswerColumns';
import { cn } from '../../../lib/utils';

export interface SharedRunProps {
  /** The question that was asked. */
  prompt: string;
  /** Formatted date the link was shared. */
  sharedOn: string;
  /** Formatted date the link stops working. */
  expiresOn: string;
  /** Agreement as the workspace showed it, or null when the run had no score. */
  agreement: AgreementSummaryProps | null;
  /** The consensus answer, read only. */
  consensus: ConsensusAnswerProps;
  /** Every answer, read only. */
  answers: AnswerColumnItem[];
  /** Where "Ask your own question" leads. */
  ctaHref: string;
  className?: string;
}

const label = 'text-caption font-medium uppercase tracking-wider text-primary';

/**
 * SharedRun organism: the public, read-only page of a shared run. The
 * question, when it was shared and when the link expires, the agreement
 * score and consensus side by side, every answer, and a way to ask your
 * own question. Nothing on it can change the run.
 *
 * @example
 * ```tsx
 * <SharedRun prompt="..." sharedOn="18 November 2026" expiresOn="18 December 2026"
 *   agreement={{ status: 'ready', score: 0.86, pairs }} consensus={{ status: 'success', text, method: 'standard' }}
 *   answers={answers} ctaHref="/workspace" />
 * ```
 */
export function SharedRun({ prompt, sharedOn, expiresOn, agreement, consensus, answers, ctaHref, className }: SharedRunProps) {
  const { t } = useTranslation();
  const key = 'organisms.sharedRun';
  return (
    <article data-testid="shared-run" className={cn('space-y-8', className)}>
      <header className="space-y-3">
        <p className={label}>{t(`${key}.label`)}</p>
        <h1 data-testid="shared-run-prompt" className="whitespace-pre-line break-words text-balance font-display text-title">
          {prompt}
        </h1>
        <p data-testid="shared-run-meta" className="text-label text-muted-foreground">
          {[t(`${key}.models`, { count: answers.length }), t(`${key}.dates`, { shared: sharedOn, expires: expiresOn })].join(' · ')}
        </p>
      </header>

      <div className={cn('grid items-start gap-4', agreement && 'lg:grid-cols-[minmax(17.5rem,1fr)_2fr]')}>
        {agreement && <AgreementSummary {...agreement} />}
        <ConsensusAnswer {...consensus} onShare={undefined} onRetry={undefined} />
      </div>

      <section aria-labelledby="shared-run-answers" className="space-y-3">
        <h2 id="shared-run-answers" className={label}>
          {t(`${key}.answers`)}
        </h2>
        <AnswerColumns answers={answers.map((a) => ({ ...a, onRetry: undefined }))} />
      </section>

      <aside data-testid="shared-run-cta" className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-body font-medium">{t(`${key}.ctaTitle`)}</p>
          <p className="text-label text-muted-foreground">{t(`${key}.ctaBody`)}</p>
        </div>
        <a href={ctaHref} data-testid="shared-run-cta-link" className={buttonVariants()}>
          {t(`${key}.cta`)}
          <ArrowRight aria-hidden="true" />
        </a>
      </aside>
    </article>
  );
}
