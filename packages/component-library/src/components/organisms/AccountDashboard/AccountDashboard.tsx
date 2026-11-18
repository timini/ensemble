import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CreditBalanceCard, type CreditBalanceCardProps } from '../../molecules/CreditBalanceCard';
import { ModelUsageList, type ModelUsageListProps } from '../../molecules/ModelUsageList';
import { PurchaseHistory, type PurchaseHistoryProps } from '../../molecules/PurchaseHistory';
import { RunHistory, type RunHistoryProps } from '../../molecules/RunHistory';
import { cn } from '../../../lib/utils';

export interface AccountDashboardProps {
  /** The signed-in user's address, shown under the heading. */
  email?: string | null;
  /** The balance card, or null while it loads. */
  balance: CreditBalanceCardProps | null;
  /** The balance could not load. */
  balanceError?: boolean;
  usage: ModelUsageListProps;
  purchases: PurchaseHistoryProps;
  runs: RunHistoryProps;
  className?: string;
}

/**
 * AccountDashboard organism: the Pro usage dashboard on /account (FR-041).
 * The credit balance with buy buttons, usage by model, purchases (refunds
 * and disputes as negative amounts) and recent runs. The app passes
 * formatted values and the paging state of each list; sign-in is the
 * app's concern.
 *
 * @example
 * ```tsx
 * <AccountDashboard email="ada@example.com" balance={balance} usage={usage} purchases={purchases} runs={runs} />
 * ```
 */
export function AccountDashboard({ email, balance, balanceError = false, usage, purchases, runs, className }: AccountDashboardProps) {
  const { t } = useTranslation();
  const key = 'organisms.accountDashboard';
  return (
    <div data-testid="account-dashboard" className={cn('space-y-6', className)}>
      <header className="space-y-1">
        <h1 className="font-display text-title font-normal">{t(`${key}.title`)}</h1>
        {email && (
          <p data-testid="account-dashboard-user" className="text-label text-muted-foreground">
            {t(`${key}.signedInAs`, { email })}
          </p>
        )}
      </header>
      {balance ? (
        <CreditBalanceCard {...balance} />
      ) : balanceError ? (
        <p data-testid="account-dashboard-balance-error" role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-5 text-label text-destructive">
          {t(`${key}.balanceError`)}
        </p>
      ) : (
        <div
          data-testid="account-dashboard-balance-loading"
          aria-busy="true"
          className="flex h-40 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-caption text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t(`${key}.balanceLoading`)}
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ModelUsageList {...usage} />
        <PurchaseHistory {...purchases} />
      </div>
      <RunHistory {...runs} />
    </div>
  );
}
