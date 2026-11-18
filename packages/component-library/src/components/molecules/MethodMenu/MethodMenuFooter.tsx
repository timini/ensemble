import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MIN_ANSWERS_FOR_RANKING } from '@ensemble-ai/shared-utils/pricing';

/** A model that can write the consensus. */
export interface SummarizerOption {
  id: string;
  name: string;
}

/** Settings at the foot of the method menu. Each row shows only when it applies. */
export interface MethodMenuFooterProps {
  /** Models that can merge the answers. The row is hidden without them. */
  summarizers?: SummarizerOption[];
  summarizerId?: string;
  onSummarizerChange?: (id: string) => void;
  /** Shows the top N row (the Ranked method is chosen and `onTopNChange` is set). */
  showTopN: boolean;
  topN: number;
  onTopNChange?: (n: number) => void;
  /** Largest top N allowed; never below MIN_ANSWERS_FOR_RANKING. */
  topNMax: number;
}

const ROW = 'mt-1 flex items-center justify-between gap-2 border-t border-border px-2.5 pb-1 pt-2.5 text-caption';
const FIELD = 'focus-ring h-8 rounded-md border border-border bg-card px-2 text-caption font-medium';

/**
 * Footer of the MethodMenu panel: the model that merges the answers and,
 * for the Ranked method, how many of the best answers it merges (kept
 * between MIN_ANSWERS_FOR_RANKING and `topNMax`). Part of MethodMenu, which
 * holds its stories and tests.
 */
export function MethodMenuFooter(props: MethodMenuFooterProps) {
  const { summarizers, onTopNChange } = props;
  const { t } = useTranslation();
  const selectId = React.useId();
  const topNId = React.useId();
  const max = Math.max(MIN_ANSWERS_FOR_RANKING, props.topNMax);

  return (
    <>
      {summarizers && summarizers.length > 0 && (
        <div className={ROW}>
          <label htmlFor={selectId} className="text-muted-foreground">
            {t('molecules.methodMenu.summarizer')}
          </label>
          <select
            id={selectId}
            value={props.summarizerId}
            onChange={(e) => props.onSummarizerChange?.(e.target.value)}
            data-testid="method-menu-summarizer"
            className={`${FIELD} max-w-[60%] truncate`}
          >
            {summarizers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {props.showTopN && onTopNChange && (
        <div className={ROW}>
          <label htmlFor={topNId} className="text-muted-foreground">
            {t('molecules.methodMenu.topN')}
          </label>
          <input
            id={topNId}
            type="number"
            inputMode="numeric"
            min={MIN_ANSWERS_FOR_RANKING}
            max={max}
            value={props.topN}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) onTopNChange(Math.min(max, Math.max(MIN_ANSWERS_FOR_RANKING, n)));
            }}
            data-testid="input-top-n"
            className={`${FIELD} w-16 tabular-nums`}
          />
        </div>
      )}
    </>
  );
}
