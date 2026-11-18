import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Sparkles } from 'lucide-react';
import { moveFocus } from '../../../lib/rovingFocus';
import { cn } from '../../../lib/utils';

/** Free calls providers from the browser with the user's keys; Pro bills credits on the server. */
export type WorkspaceMode = 'free' | 'pro';

export interface ModeSwitchProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  /** False when the server has no sign-in configured: Pro is shown disabled with a note. */
  proAvailable: boolean;
  /** Shown under the switch while Pro is chosen: the sign-in panel when signed out, or the credit notice. */
  proPanel?: React.ReactNode;
  className?: string;
}

const OPTIONS = [
  { id: 'free', Icon: KeyRound },
  { id: 'pro', Icon: Sparkles },
] as const;

/**
 * ModeSwitch molecule: Free or Pro, for the settings sheet. A radio group
 * with one tab stop; the arrow keys move and select. While Pro is chosen it
 * shows `proPanel` (sign-in or credits). Switching keeps presets and history.
 *
 * @example
 * ```tsx
 * <ModeSwitch mode={mode} onModeChange={setMode} proAvailable proPanel={<SignInPanel ... />} />
 * ```
 */
export function ModeSwitch({ mode, onModeChange, proAvailable, proPanel, className }: ModeSwitchProps) {
  const { t } = useTranslation();
  const key = 'molecules.modeSwitch';
  const groupRef = React.useRef<HTMLDivElement>(null);
  const noteId = React.useId();

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = moveFocus(groupRef.current, '[role="radio"]', event.key);
    if (index < 0) return;
    event.preventDefault();
    const next = (document.activeElement as HTMLElement | null)?.dataset.mode as WorkspaceMode | undefined;
    if (next && next !== mode) onModeChange(next);
  };

  return (
    <div data-testid="mode-switch" className={cn('flex flex-col gap-3', className)}>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={t(`${key}.label`)}
        onKeyDown={onKeyDown}
        data-testid="mode-switch-group"
        className="grid gap-2 sm:grid-cols-2"
      >
        {OPTIONS.map(({ id, Icon }) => {
          const on = mode === id;
          const disabled = id === 'pro' && !proAvailable;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              aria-describedby={disabled ? noteId : undefined}
              data-mode={id}
              data-testid={`mode-switch-${id}`}
              onClick={() => onModeChange(id)}
              className={cn(
                'focus-ring flex gap-3 rounded-xl border p-3 text-left transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60',
                on ? 'border-primary bg-accent/60' : 'border-border hover:bg-muted disabled:hover:bg-transparent',
              )}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
              <span>
                <span className="block text-label font-semibold">{t(`${key}.${id}.title`)}</span>
                <span className="block text-caption text-muted-foreground">{t(`${key}.${id}.body`)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!proAvailable && (
        <p id={noteId} data-testid="mode-switch-unavailable" className="text-caption text-muted-foreground">
          {t(`${key}.unavailable`)}
        </p>
      )}
      <p className="text-caption text-muted-foreground">{t(`${key}.keeps`)}</p>
      {mode === 'pro' && proPanel && <div data-testid="mode-switch-pro-panel">{proPanel}</div>}
    </div>
  );
}
