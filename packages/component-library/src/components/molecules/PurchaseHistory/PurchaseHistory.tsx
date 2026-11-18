import { useTranslation } from 'react-i18next';
import { AccountSection, type AccountListProps } from '../AccountSection';
import { cn } from '../../../lib/utils';

/** A ledger entry that moved money: a pack bought, free credits, or credits taken back. */
export interface PurchaseHistoryItem {
  id: string;
  kind: 'purchase' | 'grant' | 'refund' | 'dispute';
  /** purchase: the pack's price, e.g. "$20". */
  pack?: string;
  /** Formatted and signed, e.g. "+$20.00" or "-$20.00". */
  amount: string;
  /** Formatted date. */
  date: string;
  /** Credits taken back: shown in the destructive colour. */
  negative?: boolean;
}

export interface PurchaseHistoryProps extends AccountListProps {
  items: PurchaseHistoryItem[];
  className?: string;
}

/**
 * PurchaseHistory molecule: credit packs bought, free credits, and
 * credits taken back after a refund or dispute, newest first (FR-041).
 *
 * @example
 * ```tsx
 * <PurchaseHistory status="ready" items={[{ id: 'p', kind: 'purchase', pack: '$5', amount: '+$5.00', date: '3 Nov 2026' }]} />
 * ```
 */
export function PurchaseHistory({ items, className, ...list }: PurchaseHistoryProps) {
  const { t } = useTranslation();
  const key = 'molecules.purchaseHistory';
  const title = (item: PurchaseHistoryItem) =>
    item.kind === 'purchase'
      ? item.pack
        ? t(`${key}.purchase`, { pack: item.pack })
        : t(`${key}.purchaseUnknown`)
      : t(`${key}.${item.kind}`);
  return (
    <AccountSection {...list} title={t(`${key}.title`)} testId="purchase-history" emptyText={t(`${key}.empty`)} itemCount={items.length} className={className}>
      {items.map((item) => (
        <li key={item.id} data-testid={`purchase-history-item-${item.id}`} data-kind={item.kind} className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="text-label">{title(item)}</p>
            <p className="text-caption text-muted-foreground">{item.date}</p>
          </div>
          <span data-testid={`purchase-history-amount-${item.id}`} className={cn('shrink-0 font-mono text-label tabular-nums', item.negative && 'text-destructive')}>
            {item.amount}
          </span>
        </li>
      ))}
    </AccountSection>
  );
}
