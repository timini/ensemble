import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { cn } from '../../../lib/utils';

/** Loading the first page, failed, or ready (possibly empty). */
export type AccountListStatus = 'loading' | 'error' | 'ready';

/** Paging state shared by the account page's lists. */
export interface AccountListProps {
  status: AccountListStatus;
  /** More items after these. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** The next page is loading. */
  loadingMore?: boolean;
}

export interface AccountSectionProps extends AccountListProps {
  title: string;
  /** Root test id; parts are `${testId}-list`, `-empty`, `-loading`, `-error`, `-more`. */
  testId: string;
  /** Shown when ready with no items. */
  emptyText: string;
  itemCount: number;
  /** Text under the list, such as a note on what it covers. */
  footnote?: React.ReactNode;
  /** The `<li>` rows. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * AccountSection molecule: a titled card holding one of the account
 * page's lists (purchases, usage by model, recent runs), with its loading,
 * error and empty states and a Show more button for the next page.
 *
 * @example
 * ```tsx
 * <AccountSection title="Purchases" testId="purchases" status="ready" emptyText="No purchases yet." itemCount={rows.length}>
 *   {rows}
 * </AccountSection>
 * ```
 */
export function AccountSection(props: AccountSectionProps) {
  const { t } = useTranslation();
  const { testId, status, itemCount } = props;
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} data-testid={testId} className={cn('space-y-3 rounded-2xl border border-border bg-card p-5', props.className)}>
      <h2 id={headingId} className="text-label font-semibold">
        {props.title}
      </h2>
      {status === 'loading' && (
        <div data-testid={`${testId}-loading`} aria-busy="true" className="flex items-center gap-2 py-2 text-caption text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t('molecules.accountSection.loading')}
        </div>
      )}
      {status === 'error' && (
        <p data-testid={`${testId}-error`} role="alert" className="text-label text-destructive">
          {t('molecules.accountSection.error')}
        </p>
      )}
      {status === 'ready' && itemCount === 0 && (
        <p data-testid={`${testId}-empty`} className="text-label text-muted-foreground">
          {props.emptyText}
        </p>
      )}
      {status === 'ready' && itemCount > 0 && (
        <ul data-testid={`${testId}-list`} className="divide-y divide-border">
          {props.children}
        </ul>
      )}
      {status === 'ready' && props.footnote}
      {status === 'ready' && props.hasMore && props.onLoadMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={props.onLoadMore}
          disabled={props.loadingMore}
          aria-busy={props.loadingMore || undefined}
          data-testid={`${testId}-more`}
        >
          {props.loadingMore && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t('molecules.accountSection.more')}
        </Button>
      )}
    </section>
  );
}
