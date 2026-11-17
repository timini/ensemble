import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AnswerCard, type AnswerCardProps } from '../../molecules/AnswerCard';
import { cn } from '../../../lib/utils';

/** One answer in the columns. `id` is the model id or the manual answer id. */
export interface AnswerColumnItem extends Omit<AnswerCardProps, 'id' | 'testId'> {
  id: string;
}

export interface AnswerColumnsProps {
  answers: AnswerColumnItem[];
  className?: string;
}

const DOT: Partial<Record<AnswerCardProps['status'], string>> = {
  streaming: 'animate-pulse bg-primary',
  waiting: 'animate-pulse bg-muted-foreground',
  error: 'bg-destructive',
};

/**
 * AnswerColumns organism: every model's answer side by side. From 768 px the
 * answers sit in columns. Below that they are swipeable tabs: one answer per
 * screen with scroll snapping, and a tab bar that follows the swipe and
 * supports the arrow keys, Home and End.
 *
 * @example
 * ```tsx
 * <AnswerColumns answers={answers} />
 * ```
 */
export function AnswerColumns({ answers, className }: AnswerColumnsProps) {
  const { t } = useTranslation();
  const base = React.useId();
  const headingId = `${base}-heading`;
  const [selected, setSelected] = React.useState(0);
  const track = React.useRef<HTMLDivElement>(null);
  const tabs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const active = Math.min(selected, Math.max(0, answers.length - 1));

  const show = (index: number, focus = false) => {
    setSelected(index);
    if (focus) tabs.current[index]?.focus();
    const el = track.current;
    el?.scrollTo?.({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = track.current;
    if (el && el.clientWidth) setSelected(Math.round(el.scrollLeft / el.clientWidth));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = answers.length - 1;
    const next = { ArrowRight: active === last ? 0 : active + 1, ArrowLeft: active === 0 ? last : active - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    show(next, true);
  };

  return (
    <section aria-labelledby={headingId} data-testid="answer-columns" className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
          {t('organisms.answerColumns.heading')}
        </h2>
        <p className="text-caption text-muted-foreground md:hidden">{t('organisms.answerColumns.swipe')}</p>
      </div>

      <div role="tablist" aria-label={t('organisms.answerColumns.tabs')} onKeyDown={onKeyDown} className="flex gap-1 rounded-xl bg-muted p-1 md:hidden">
        {answers.map((answer, i) => (
          <button
            key={answer.id}
            ref={(node) => {
              tabs.current[i] = node;
            }}
            id={`${base}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls={`${base}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            data-status={answer.status}
            onClick={() => show(i)}
            className={cn(
              'focus-ring flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-caption font-medium transition-colors duration-fast',
              active === i ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {DOT[answer.status] && <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', DOT[answer.status])} />}
            <span className="truncate">{answer.modelName}</span>
          </button>
        ))}
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        data-testid="answer-columns-track"
        className="-mx-gutter flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] md:gap-4 md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {answers.map(({ id, ...answer }, i) => (
          <div
            key={id}
            id={`${base}-panel-${i}`}
            role="tabpanel"
            aria-label={answer.modelName}
            className="w-full shrink-0 snap-center px-gutter md:px-0"
          >
            <AnswerCard {...answer} />
          </div>
        ))}
      </div>
    </section>
  );
}
