import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { cn } from '../../../lib/utils';

/** Sign-in failures the panel can explain. The app maps Firebase error codes to these. */
export type SignInError = 'popupClosed' | 'invalidEmail' | 'network' | 'expiredLink' | 'generic';

export interface SignInPanelProps {
  /** Start Google sign-in (a popup). */
  onGoogle: () => void;
  /** Send a sign-in link to this address, or finish one when `confirmEmail` is set. */
  onEmailLink: (email: string) => void;
  /** Address the last link went to. Shows a check-your-inbox note. */
  emailSentTo?: string | null;
  /**
   * An email link was opened where the address is not remembered (another
   * device or browser): ask for it again to finish, and hide Google.
   */
  confirmEmail?: boolean;
  /** A request is in flight; the buttons are disabled. */
  pending?: boolean;
  error?: SignInError | null;
  className?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * SignInPanel molecule: Google sign-in and a passwordless email link, with
 * a line on why an account is needed at all (Pro credits, sharing, synced
 * history; Free mode works without one). It holds no auth logic: the app
 * passes callbacks and the state of the request.
 *
 * @example
 * ```tsx
 * <SignInPanel onGoogle={signInWithGoogle} onEmailLink={sendLink} emailSentTo={sentTo} error={error} />
 * ```
 */
export function SignInPanel({
  onGoogle,
  onEmailLink,
  emailSentTo,
  confirmEmail = false,
  pending = false,
  error,
  className,
}: SignInPanelProps) {
  const { t } = useTranslation();
  const inputId = React.useId();
  const [email, setEmail] = React.useState('');
  const [invalid, setInvalid] = React.useState(false);
  const shownError: SignInError | null = invalid ? 'invalidEmail' : (error ?? null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onEmailLink(address);
  };

  return (
    <div data-testid="sign-in-panel" className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-label font-semibold">
          {t(confirmEmail ? 'molecules.signInPanel.confirmTitle' : 'molecules.signInPanel.title')}
        </h2>
        <p className="text-caption text-muted-foreground">
          {t(confirmEmail ? 'molecules.signInPanel.confirmHint' : 'molecules.signInPanel.why')}
        </p>
      </div>
      {!confirmEmail && (
        <>
          <Button type="button" variant="outline" onClick={onGoogle} disabled={pending} data-testid="sign-in-google">
            <GoogleMark />
            {t('molecules.signInPanel.google')}
          </Button>
          <div className="flex items-center gap-2 text-caption text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t('molecules.signInPanel.or')}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form noValidate onSubmit={submit} className="flex flex-col gap-2" data-testid="sign-in-email-form">
        <label htmlFor={inputId} className="text-caption font-medium">
          {t('molecules.signInPanel.emailLabel')}
        </label>
        <Input
          id={inputId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('molecules.signInPanel.emailPlaceholder')}
          aria-invalid={invalid || undefined}
          data-testid="sign-in-email-input"
        />
        <Button type="submit" disabled={pending} data-testid="sign-in-email-submit">
          <Mail aria-hidden="true" />
          {pending
            ? t('molecules.signInPanel.sending')
            : t(confirmEmail ? 'molecules.signInPanel.confirm' : 'molecules.signInPanel.sendLink')}
        </Button>
      </form>
      {emailSentTo && !shownError && (
        <p role="status" className="text-caption text-success" data-testid="sign-in-email-sent">
          {t('molecules.signInPanel.sent', { email: emailSentTo })}
        </p>
      )}
      {shownError && (
        <p role="alert" className="text-caption text-destructive" data-testid="sign-in-error">
          {t(`molecules.signInPanel.errors.${shownError}`)}
        </p>
      )}
    </div>
  );
}

/** The Google "G", drawn in the current text colour so it follows the theme. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1a6.18 6.18 0 0 1 0-12.36c1.76 0 2.94.75 3.62 1.4l2.46-2.37A9.7 9.7 0 0 0 12 2.3a9.7 9.7 0 1 0 0 19.4c5.6 0 9.31-3.94 9.31-9.48 0-.64-.07-1.12-.16-1.6Z" />
    </svg>
  );
}
