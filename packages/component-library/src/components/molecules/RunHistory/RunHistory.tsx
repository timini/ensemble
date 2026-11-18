import { useTranslation } from 'react-i18next';
import { AccountSection, type AccountListProps } from '../AccountSection';

/** A settled Pro run. */
export interface RunHistoryItem {
  id: string;
  /** Formatted date and time. */
  date: string;
  /** Display names of the models it called, each once. */
  models: string[];
  calls: number;
  /** Formatted credits charged. */
  amount: string;
}

export interface RunHistoryProps extends AccountListProps {
  items: RunHistoryItem[];
  className?: string;
}

/**
 * RunHistory molecule: recent Pro runs, newest first, with the models
 * each called, its number of calls and what it was charged (FR-041).
 *
 * @example
 * ```tsx
 * <RunHistory status="ready" items={[{ id: 'r1', date: 'Today, 09:41', models: ['GPT-6 Luna'], calls: 3, amount: '$0.02' }]} />
 * ```
 */
export function RunHistory({ items, className, ...list }: RunHistoryProps) {
  const { t } = useTranslation();
  const key = 'molecules.runHistory';
  return (
    <AccountSection {...list} title={t(`${key}.title`)} testId="run-history" emptyText={t(`${key}.empty`)} itemCount={items.length} className={className}>
      {items.map((item) => (
        <li key={item.id} data-testid={`run-history-item-${item.id}`} className="flex items-start justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="text-label">{item.date}</p>
            <p className="text-caption text-muted-foreground">
              {item.models.join(', ')}
              <span aria-hidden="true"> · </span>
              {t(`${key}.calls`, { count: item.calls })}
            </p>
          </div>
          <span data-testid={`run-history-amount-${item.id}`} className="shrink-0 font-mono text-label tabular-nums">
            {item.amount}
          </span>
        </li>
      ))}
    </AccountSection>
  );
}
