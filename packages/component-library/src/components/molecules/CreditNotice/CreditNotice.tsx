import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, Coins } from 'lucide-react';
import { CreditPackButtons, type CreditPackOption } from '../CreditPackButtons';
import { cn } from '../../../lib/utils';

export type { CreditPackOption };

/** Which credit state to show. `negative`: a refund or dispute left the balance below zero. */
export type CreditNoticeVariant = 'balance' | 'low' | 'insufficient' | 'negative' | 'unpriced' | 'error';

export interface CreditNoticeProps {
  variant: CreditNoticeVariant;
  /** Formatted balance, e.g. "$0.42". */
  balance?: string;
  /** Formatted credits this run needs (insufficient). */
  required?: string;
  /** Models with no price (unpriced): Pro cannot bill them. */
  unpricedModels?: string[];
  packs: CreditPackOption[];
  /** Starts Stripe Checkout for a pack. Buttons hidden without it. */
  onBuy?: (packId: string) => void;
  /** Pack id whose checkout is starting: that button shows a spinner, all are disabled. */
  pendingPackId?: string | null;
  /** A checkout could not start. */
  buyError?: boolean;
  className?: string;
}

const STYLE: Record<CreditNoticeVariant, { box: string; icon: string; Icon: typeof Coins }> = {
  balance: { box: 'border-border bg-card', icon: 'text-muted-foreground', Icon: Coins },
  low: { box: 'border-warning/25 bg-warning/[0.06]', icon: 'text-warning', Icon: AlertTriangle },
  unpriced: { box: 'border-warning/25 bg-warning/[0.06]', icon: 'text-warning', Icon: AlertTriangle },
  insufficient: { box: 'border-destructive/25 bg-destructive/[0.06]', icon: 'text-destructive', Icon: AlertCircle },
  negative: { box: 'border-destructive/25 bg-destructive/[0.06]', icon: 'text-destructive', Icon: AlertCircle },
  error: { box: 'border-destructive/25 bg-destructive/[0.06]', icon: 'text-destructive', Icon: AlertCircle },
};

/** Variants where buying credits fixes the problem, so the packs are offered. */
const BUYABLE: CreditNoticeVariant[] = ['balance', 'low', 'insufficient', 'negative'];

/** "A", "A and B", "A, B and C". */
function listOf(items: string[], and: string): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

/**
 * CreditNotice molecule: the Pro credit status. Shows the balance with a
 * buy button per credit pack, warns when the balance is low, and blocks a
 * run the balance cannot cover, a negative balance (a refunded or disputed
 * purchase) or a run that uses models Pro cannot price. Buying
 * starts Stripe Checkout through `onBuy`; the app owns the request state.
 *
 * @example
 * ```tsx
 * <CreditNotice variant="low" balance="$0.42" packs={packs} onBuy={startCheckout} pendingPackId={pending} />
 * ```
 */
export function CreditNotice({
  variant,
  balance,
  required,
  unpricedModels = [],
  packs,
  onBuy,
  pendingPackId,
  buyError = false,
  className,
}: CreditNoticeProps) {
  const { t } = useTranslation();
  const key = 'molecules.creditNotice';
  const { box, icon, Icon } = STYLE[variant];
  const message =
    variant === 'unpriced'
      ? t(`${key}.unpriced`, { count: unpricedModels.length, models: listOf(unpricedModels, t(`${key}.and`)) })
      : t(`${key}.${variant}`, { balance, required });
  const showBuy = Boolean(onBuy) && BUYABLE.includes(variant);

  return (
    <div
      data-testid="credit-notice"
      data-variant={variant}
      role={variant === 'balance' || variant === 'low' ? 'status' : 'alert'}
      className={cn('flex flex-col gap-3 rounded-lg border p-4', box, className)}
    >
      <p data-testid="credit-notice-message" className="flex items-start gap-3 text-sm text-foreground">
        <Icon className={cn('mt-0.5 size-4 shrink-0', icon)} aria-hidden="true" />
        <span>{message}</span>
      </p>
      {showBuy && onBuy && (
        <CreditPackButtons
          packs={packs}
          onBuy={onBuy}
          pendingPackId={pendingPackId}
          variant={variant === 'balance' ? 'outline' : 'default'}
          testIdPrefix="credit-notice-buy"
          className="pl-7"
        />
      )}
      {buyError && (
        <p role="alert" data-testid="credit-notice-buy-error" className="pl-7 text-caption text-destructive">
          {t(`${key}.buyError`)}
        </p>
      )}
    </div>
  );
}
