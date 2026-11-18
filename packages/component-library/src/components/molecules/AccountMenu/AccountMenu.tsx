import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, LogOut } from 'lucide-react';
import { Avatar } from '../../atoms/Avatar';
import { Button } from '../../atoms/Button';
import { SignInPanel, type SignInPanelProps } from '../SignInPanel';
import { usePopover } from '../../../lib/usePopover';
import { cn } from '../../../lib/utils';

/**
 * `unavailable`: this server has no Firebase config, so nobody can sign in.
 * `loading`: waiting for the stored session.
 */
export type AccountStatus = 'unavailable' | 'loading' | 'signedOut' | 'signedIn';

/** What the menu shows of the signed-in user. */
export interface AccountUser {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export interface AccountMenuProps {
  status: AccountStatus;
  user?: AccountUser | null;
  onSignOut?: () => void;
  /** The sign-in panel while signed out. */
  signIn?: SignInPanelProps;
  /** Extra content while signed in, such as the credit balance. */
  children?: React.ReactNode;
  /** Start with the panel open (stories, an email link to confirm). */
  defaultOpen?: boolean;
  className?: string;
}

/** One or two initials for the avatar fallback. */
export function initialsOf(user: AccountUser): string {
  const words = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const first = words[0]?.[0] ?? '';
    const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() ?? '?';
}

const TRIGGER =
  'focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg text-label font-medium transition-colors duration-fast hover:bg-muted disabled:opacity-60';

/**
 * AccountMenu molecule: the account slot at the right of the AppShell
 * header. Signed out it opens the SignInPanel; signed in it shows the
 * user, any extra content (credits) and Sign out. When the server has no
 * sign-in configured it explains that Free mode needs no account.
 *
 * @example
 * ```tsx
 * <AccountMenu status="signedIn" user={{ name: 'Ada' }} onSignOut={signOut} />
 * ```
 */
export function AccountMenu({ status, user, onSignOut, signIn, children, defaultOpen = false, className }: AccountMenuProps) {
  const { t } = useTranslation();
  const popover = usePopover(defaultOpen);
  const signedIn = status === 'signedIn' && user;
  const displayName = user?.name ?? user?.email ?? '';

  return (
    <div className={cn('relative', className)}>
      {status === 'loading' ? (
        <button type="button" disabled aria-label={t('molecules.accountMenu.loading')} data-testid="account-menu-trigger" className={cn(TRIGGER, 'w-10')}>
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          ref={popover.triggerRef}
          {...popover.triggerProps}
          aria-label={signedIn ? t('molecules.accountMenu.account', { name: displayName }) : undefined}
          data-testid="account-menu-trigger"
          data-status={status}
          className={cn(TRIGGER, signedIn ? 'w-10' : 'px-3')}
        >
          {signedIn ? (
            <Avatar size="sm" src={user.photoURL ?? undefined} alt="">
              {initialsOf(user)}
            </Avatar>
          ) : (
            t('molecules.accountMenu.signIn')
          )}
        </button>
      )}
      {popover.open && status !== 'loading' && (
        <div
          ref={popover.panelRef}
          id={popover.panelId}
          data-testid="account-menu-panel"
          className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] animate-rise-in rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg"
        >
          {status === 'unavailable' && (
            <div data-testid="account-menu-unavailable" className="flex flex-col gap-1">
              <h2 className="text-label font-semibold">{t('molecules.accountMenu.unavailableTitle')}</h2>
              <p className="text-caption text-muted-foreground">{t('molecules.accountMenu.unavailable')}</p>
            </div>
          )}
          {status === 'signedOut' && signIn && <SignInPanel {...signIn} />}
          {signedIn && (
            <div className="flex flex-col gap-3">
              <div data-testid="account-menu-user" className="min-w-0">
                <p className="text-caption text-muted-foreground">{t('molecules.accountMenu.signedInAs')}</p>
                {user.name && <p className="truncate text-label font-medium">{user.name}</p>}
                {user.email && <p className="truncate text-caption text-muted-foreground">{user.email}</p>}
              </div>
              {children}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  popover.close();
                  onSignOut?.();
                }}
                data-testid="account-menu-sign-out"
              >
                <LogOut aria-hidden="true" />
                {t('molecules.accountMenu.signOut')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
