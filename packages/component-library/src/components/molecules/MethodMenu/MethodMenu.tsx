import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import { MIN_ANSWERS_FOR_CONSENSUS, MIN_ANSWERS_FOR_RANKING, type RunEstimate } from '@ensemble-ai/shared-utils/pricing';
import { usePopover } from '../../../lib/usePopover';
import { moveFocus } from '../../../lib/rovingFocus';
import { cn } from '../../../lib/utils';
import { methodCostLabel } from './methodCost';

/** A model that can write the consensus. */
export interface SummarizerOption {
  id: string;
  name: string;
}

export interface MethodMenuProps {
  method: ConsensusMethod;
  onMethodChange: (method: ConsensusMethod) => void;
  /** estimateRun result for each method with the current models and prompt. */
  estimates: Partial<Record<ConsensusMethod, RunEstimate>>;
  /** Models that can merge the answers. The choice is hidden without them. */
  summarizers?: SummarizerOption[];
  summarizerId?: string;
  onSummarizerChange?: (id: string) => void;
  /** Start with the panel open (stories). */
  defaultOpen?: boolean;
  disabled?: boolean;
}

const METHODS: ConsensusMethod[] = ['standard', 'majority', 'elo', 'council'];
const OPTION = '[role="radio"]';

/** Fewest answers a method needs, as in shared-utils countConsensusCalls. */
const minAnswers = (m: ConsensusMethod) => (m === 'elo' || m === 'council' ? MIN_ANSWERS_FOR_RANKING : MIN_ANSWERS_FOR_CONSENSUS);

/**
 * MethodMenu molecule: the consensus method dropdown in the composer. Every
 * method shows its number of model calls and its cost range from
 * `estimateRun` before the run, so the user sees what Council costs before
 * choosing it. The footer picks the model that merges the answers.
 * The methods form a radio group: the arrow keys move to the next available
 * method and check it, Enter or a click checks it and closes the menu.
 *
 * @example
 * ```tsx
 * <MethodMenu method={method} onMethodChange={setMethod} estimates={estimates}
 *   summarizers={models} summarizerId={id} onSummarizerChange={setId} />
 * ```
 */
export function MethodMenu({
  method,
  onMethodChange,
  estimates,
  summarizers,
  summarizerId,
  onSummarizerChange,
  defaultOpen = false,
  disabled,
}: MethodMenuProps) {
  const { t, i18n } = useTranslation();
  const popover = usePopover(defaultOpen);
  const listRef = React.useRef<HTMLDivElement>(null);
  const selectId = React.useId();
  const locale = i18n.language || 'en';
  const name = (m: ConsensusMethod) => t(`molecules.methodMenu.methods.${m}.name`);
  const calls = (e: RunEstimate) => t('molecules.methodMenu.calls', { count: e.calls.total });
  const current = estimates[method];
  const isUnavailable = (m: ConsensusMethod) => estimates[m]?.consensusAvailable === false;
  // Roving tab stop: the checked method, or the first available one when the
  // checked method cannot run with the current answers.
  const tabStop = isUnavailable(method) ? (METHODS.find((m) => !isUnavailable(m)) ?? method) : method;

  React.useEffect(() => {
    if (popover.open) listRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    // Focus only when the panel opens, not on every method change.
  }, [popover.open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (moveFocus(listRef.current, OPTION, event.key) < 0) return;
    event.preventDefault();
    const next = (document.activeElement as HTMLElement | null)?.dataset.method as ConsensusMethod | undefined;
    if (next && next !== method) onMethodChange(next);
  };

  const choose = (m: ConsensusMethod) => {
    onMethodChange(m);
    popover.close();
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={popover.triggerRef}
        {...popover.triggerProps}
        disabled={disabled}
        data-testid="method-menu-trigger"
        className="focus-ring flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-label shadow-sm transition-colors duration-fast hover:bg-muted disabled:opacity-50"
      >
        <span className="text-muted-foreground">{t('molecules.methodMenu.label')}</span>
        <span className="font-medium">{name(method)}</span>
        {current && (
          <span className="hidden text-caption tabular-nums text-muted-foreground sm:inline">
            {calls(current)}, {methodCostLabel(current, t, locale)}
          </span>
        )}
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-fast', popover.open && 'rotate-180')} aria-hidden="true" />
      </button>
      {popover.open && (
        <div
          ref={popover.panelRef}
          id={popover.panelId}
          data-testid="method-menu-panel"
          className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-rise-in rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <div
            ref={listRef}
            role="radiogroup"
            aria-label={t('molecules.methodMenu.listLabel')}
            onKeyDown={onKeyDown}
          >
            {METHODS.map((m) => {
              const e = estimates[m];
              const on = m === method;
              const unavailable = isUnavailable(m);
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={m === tabStop ? 0 : -1}
                  disabled={unavailable}
                  onClick={() => choose(m)}
                  data-testid={`method-option-${m}`}
                  data-method={m}
                  className={cn(
                    'focus-ring flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors duration-fast hover:bg-muted disabled:opacity-60',
                    on && 'bg-accent text-accent-foreground hover:bg-accent',
                  )}
                >
                  <Check className={cn('mt-0.5 size-4 shrink-0 text-primary', !on && 'invisible')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-label font-medium">{name(m)}</span>
                      {e && <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{calls(e)}</span>}
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
                      <span>{unavailable ? t('molecules.methodMenu.unavailable', { count: minAnswers(m) }) : t(`molecules.methodMenu.methods.${m}.detail`)}</span>
                      {e && !unavailable && <span className="shrink-0 tabular-nums">{methodCostLabel(e, t, locale)}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {summarizers && summarizers.length > 0 && (
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-2.5 pb-1 pt-2.5 text-caption">
              <label htmlFor={selectId} className="text-muted-foreground">
                {t('molecules.methodMenu.summarizer')}
              </label>
              <select
                id={selectId}
                value={summarizerId}
                onChange={(e) => onSummarizerChange?.(e.target.value)}
                data-testid="method-menu-summarizer"
                className="focus-ring h-8 max-w-[60%] truncate rounded-md border border-border bg-card px-2 text-caption font-medium"
              >
                {summarizers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="px-2.5 pb-1.5 pt-1 text-caption text-muted-foreground">{t('molecules.methodMenu.note')}</p>
        </div>
      )}
    </div>
  );
}
