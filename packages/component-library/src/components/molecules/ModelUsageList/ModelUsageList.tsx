import { useTranslation } from 'react-i18next';
import { AccountSection, type AccountListProps } from '../AccountSection';

/** One model's usage over the period. */
export interface ModelUsageItem {
  /** `provider/modelId`. */
  id: string;
  /** Display name. */
  name: string;
  runs: number;
  calls: number;
  /** Formatted token count, e.g. "182k". */
  tokens: string;
  /** Formatted credits charged for this model. */
  amount: string;
  /** Share of all credits in the period, 0 to 1. */
  share: number;
}

export interface ModelUsageListProps extends AccountListProps {
  items: ModelUsageItem[];
  /** Length of the period in days. */
  days: number;
  /** More runs fell in the period than were counted. */
  truncated?: boolean;
  className?: string;
}

/**
 * ModelUsageList molecule: credits per model over the last `days` days,
 * with runs, calls and tokens and a bar for each model's share (FR-041).
 *
 * @example
 * ```tsx
 * <ModelUsageList status="ready" days={30} items={[{ id: 'openai/gpt-6-luna', name: 'GPT-6 Luna', runs: 3, calls: 3, tokens: '12k', amount: '$0.04', share: 1 }]} />
 * ```
 */
export function ModelUsageList({ items, days, truncated = false, className, ...list }: ModelUsageListProps) {
  const { t } = useTranslation();
  const key = 'molecules.modelUsageList';
  const footnote = truncated ? (
    <p data-testid="model-usage-truncated" className="text-caption text-muted-foreground">
      {t(`${key}.truncated`)}
    </p>
  ) : undefined;
  return (
    <AccountSection
      {...list}
      title={t(`${key}.title`, { count: days })}
      testId="model-usage"
      emptyText={t(`${key}.empty`, { count: days })}
      itemCount={items.length}
      footnote={footnote}
      className={className}
    >
      {items.map((item) => (
        <li key={item.id} data-testid={`model-usage-item-${item.id}`} className="space-y-1.5 py-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="min-w-0 truncate text-label">{item.name}</p>
            <span className="shrink-0 font-mono text-label tabular-nums">{item.amount}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
            <div
              data-testid={`model-usage-bar-${item.id}`}
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, item.share)) * 100)}%` }}
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {[
              t(`${key}.runs`, { count: item.runs }),
              t(`${key}.calls`, { count: item.calls }),
              t(`${key}.tokens`, { tokens: item.tokens }),
            ].join(', ')}
          </p>
        </li>
      ))}
    </AccountSection>
  );
}
