import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, Coins } from 'lucide-react';
import { CreditPackButtons, type CreditPackOption } from '../CreditPackButtons';
import { cn } from '../../../lib/utils';

/** `low`: under the warning threshold (FR-038). `negative`: below zero after a refund or dispute. */
export type CreditBalanceState = 'ok' | 'low' | 'negative';

export interface CreditBalanceCardProps {
  state: CreditBalanceState;
  /** Formatted balance, e.g. "$22.03". */
  balance: string;
  packs: CreditPackOption[];
  /** Starts Stripe Checkout for a pack. Buttons hidden without it. */
  onBuy?: (packId: string) => void;
  pendingPackId?: string | null;
  /** A checkout could not start. */
  buyError?: boolean;
  className?: string;
}

const STYLE: Record<CreditBalanceState, { box: string; icon: string; Icon: typeof Coins }> = {
  ok: { box: 'border-border bg-card', icon: 'text-muted-foreground', Icon: Coins },
  low: { box: 'border-warning/25 bg-warning/[0.06]', icon: 'text-warning', Icon: AlertTriangle },
  negative: { box: 'border-destructive/25 bg-destructive/[0.06]', icon: 'text-destructive', Icon: AlertCircle },
};

/**
 * CreditBalanceCard molecule: the Pro credit balance at the top of the
 * account page, what it means (billing, low, or paused after a refund or
 * dispute) and a buy button per credit pack.
 *
 * @example
 * ```tsx
 * <CreditBalanceCard state="ok" balance="$22.03" packs={packs} onBuy={startCheckout} />
 * ```
 */
export function CreditBalanceCard({ state, balance, packs, onBuy, pendingPackId, buyError = false, className }: CreditBalanceCardProps) {
  const { t } = useTranslation();
  const key = 'molecules.creditBalanceCard';
  const { box, icon, Icon } = STYLE[state];
  return (
    <section
      aria-labelledby="credit-balance-title"
      data-testid="credit-balance"
      data-state={state}
      className={cn('space-y-4 rounded-2xl border p-5', box, className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id="credit-balance-title" className="text-label text-muted-foreground">
            {t(`${key}.title`)}
          </h2>
          <p data-testid="credit-balance-amount" className="font-display text-display leading-none tabular-nums">
            {balance}
          </p>
        </div>
        <Icon className={cn('mt-1 size-5 shrink-0', icon)} aria-hidden="true" />
      </div>
      <p data-testid="credit-balance-message" role={state === 'negative' ? 'alert' : undefined} className="max-w-prose text-label text-muted-foreground">
        {t(`${key}.${state}`)}
      </p>
      {onBuy && packs.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CreditPackButtons
            packs={packs}
            onBuy={onBuy}
            pendingPackId={pendingPackId}
            variant={state === 'ok' ? 'outline' : 'default'}
            testIdPrefix="credit-balance-buy"
          />
          <span className="text-caption text-muted-foreground">{t(`${key}.note`)}</span>
        </div>
      )}
      {buyError && (
        <p role="alert" data-testid="credit-balance-buy-error" className="text-caption text-destructive">
          {t(`${key}.buyError`)}
        </p>
      )}
    </section>
  );
}
