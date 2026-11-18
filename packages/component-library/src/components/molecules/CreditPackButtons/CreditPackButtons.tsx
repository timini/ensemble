import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { cn } from '../../../lib/utils';

/** A credit pack the user can buy. */
export interface CreditPackOption {
  id: string;
  /** Already formatted, e.g. "$5". */
  label: string;
}

export interface CreditPackButtonsProps {
  packs: CreditPackOption[];
  /** Starts Stripe Checkout for a pack. */
  onBuy: (packId: string) => void;
  /** Pack id whose checkout is starting: that button shows a spinner, all are disabled. */
  pendingPackId?: string | null;
  /** Filled buttons ask for action; outlined ones sit beside a balance that needs none. */
  variant?: 'default' | 'outline';
  /** Test ids are `${testIdPrefix}-${pack.id}`. */
  testIdPrefix?: string;
  className?: string;
}

/**
 * CreditPackButtons molecule: one "Buy $5" button per credit pack, in a
 * labelled group. Used by CreditNotice and CreditBalanceCard; the app owns
 * the checkout request and passes its state back.
 *
 * @example
 * ```tsx
 * <CreditPackButtons packs={[{ id: 'usd-5', label: '$5' }]} onBuy={startCheckout} />
 * ```
 */
export function CreditPackButtons({
  packs,
  onBuy,
  pendingPackId,
  variant = 'default',
  testIdPrefix = 'credit-pack-buy',
  className,
}: CreditPackButtonsProps) {
  const { t } = useTranslation();
  if (packs.length === 0) return null;
  const pending = Boolean(pendingPackId);
  return (
    <div role="group" aria-label={t('molecules.creditPacks.packs')} className={cn('flex flex-wrap gap-2', className)}>
      {packs.map((pack) => {
        const busy = pendingPackId === pack.id;
        return (
          <Button
            key={pack.id}
            type="button"
            size="sm"
            variant={variant}
            disabled={pending}
            aria-busy={busy || undefined}
            onClick={() => onBuy(pack.id)}
            data-testid={`${testIdPrefix}-${pack.id}`}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t('molecules.creditPacks.buy', { label: pack.label })}
          </Button>
        );
      })}
    </div>
  );
}
