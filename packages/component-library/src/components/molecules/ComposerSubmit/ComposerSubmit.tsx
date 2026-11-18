import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '../../atoms/Button';

export interface ComposerSubmitProps {
  /** A run is in progress. */
  running: boolean;
  /** Ask cannot be pressed (empty prompt, no models, a run or a block). */
  disabled: boolean;
  /** Space separated ids of the hints that say why Ask is disabled. */
  describedBy?: string;
  /** Cancels the run. While running, a Stop button replaces Ask. */
  onStop?: () => void;
}

/**
 * ComposerSubmit molecule: the Ask button at the end of the Composer, a
 * form submit button. During a run it reads Running and is disabled, or,
 * when `onStop` is given, it is replaced by a Stop button that cancels the
 * run.
 *
 * @example
 * ```tsx
 * <ComposerSubmit running={running} disabled={!canSubmit} onStop={cancelRun} />
 * ```
 */
export function ComposerSubmit({ running, disabled, describedBy, onStop }: ComposerSubmitProps) {
  const { t } = useTranslation();

  if (running && onStop) {
    const stop = t('molecules.composerSubmit.stop');
    return (
      // Its own key: if React reused this element for Ask, the type would turn
      // to submit during the Stop click and the browser would submit the form.
      <Button key="stop" type="button" variant="outline" onClick={onStop} aria-label={stop} data-testid="composer-stop" className="gap-1.5 px-3 sm:px-4">
        <span className="hidden sm:inline" aria-hidden="true">
          {stop}
        </span>
        <Square className="fill-current" aria-hidden="true" />
      </Button>
    );
  }

  const label = running ? t('molecules.composerSubmit.running') : t('molecules.composerSubmit.submit');
  return (
    <Button
      key="submit"
      type="submit"
      disabled={disabled}
      aria-describedby={describedBy}
      aria-label={label}
      data-testid="composer-submit"
      className="gap-1.5 px-3 sm:px-4"
    >
      <span className="hidden sm:inline" aria-hidden="true">
        {label}
      </span>
      <ArrowUp aria-hidden="true" />
    </Button>
  );
}
