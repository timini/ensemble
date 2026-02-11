import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface EnsembleHeaderAuthUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface EnsembleHeaderProps {
  /** Callback when settings icon is clicked */
  onSettingsClick?: () => void;
  /** Authenticated user info (when signed in) */
  authUser?: EnsembleHeaderAuthUser;
  /** Callback when user clicks sign out */
  onSignOut?: () => void;
}

export function EnsembleHeader({ onSettingsClick, authUser, onSignOut }: EnsembleHeaderProps) {
  const { t, i18n, ready } = useTranslation();

  const title = (ready || i18n.isInitialized)
    ? t('ensemble.header.title')
    : 'Ensemble AI';

  const tagline = (ready || i18n.isInitialized)
    ? t('ensemble.header.tagline')
    : 'The smartest AI is an ensemble.';

  return (
    <div className="bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {tagline}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {authUser && (
              <div className="flex items-center gap-2" data-testid="header-auth-user">
                {authUser.photoURL ? (
                  <img
                    src={authUser.photoURL}
                    alt=""
                    className="h-7 w-7 rounded-full"
                    data-testid="header-auth-avatar"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
                    data-testid="header-auth-avatar-fallback"
                  >
                    {(authUser.displayName ?? authUser.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                  {authUser.displayName ?? authUser.email}
                </span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="header-sign-out-button"
                  >
                    {(ready || i18n.isInitialized)
                      ? t('ensemble.header.signOut')
                      : 'Sign out'}
                  </button>
                )}
              </div>
            )}
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
