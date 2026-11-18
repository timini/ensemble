import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, ClipboardPaste, MoreHorizontal } from 'lucide-react';
import { usePopover } from '../../../lib/usePopover';
import { moveFocus } from '../../../lib/rovingFocus';

export interface ComposerOptionsProps {
  /** Opens the manual answer sheet. */
  onAddManualResponse?: () => void;
  /** Saves the chosen models as a preset. */
  onSavePreset?: () => void;
  /** Start with the menu open (stories). */
  defaultOpen?: boolean;
  disabled?: boolean;
}

const ITEM = '[role="menuitem"]';

/**
 * ComposerOptions molecule: the "more options" menu in the composer, for the
 * less frequent actions (add an answer by hand, save the models as a preset).
 * Renders nothing when no action is wired.
 *
 * @example
 * ```tsx
 * <ComposerOptions onAddManualResponse={openManualSheet} onSavePreset={savePreset} />
 * ```
 */
export function ComposerOptions({ onAddManualResponse, onSavePreset, defaultOpen = false, disabled }: ComposerOptionsProps) {
  const { t } = useTranslation();
  const popover = usePopover(defaultOpen);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const items = [
    onAddManualResponse && { key: 'manual', icon: ClipboardPaste, label: t('molecules.composerOptions.manual'), run: onAddManualResponse },
    onSavePreset && { key: 'preset', icon: BookmarkPlus, label: t('molecules.composerOptions.savePreset'), run: onSavePreset },
  ].filter((item): item is Exclude<typeof item, undefined> => Boolean(item));

  React.useEffect(() => {
    if (popover.open) menuRef.current?.querySelector<HTMLElement>(ITEM)?.focus();
  }, [popover.open]);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        ref={popover.triggerRef}
        {...popover.triggerProps}
        aria-haspopup="menu"
        disabled={disabled}
        aria-label={t('molecules.composerOptions.label')}
        data-testid="composer-options-trigger"
        className="focus-ring inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {popover.open && (
        <div
          ref={(node) => {
            popover.panelRef.current = node;
            menuRef.current = node;
          }}
          id={popover.panelId}
          role="menu"
          aria-label={t('molecules.composerOptions.label')}
          onKeyDown={(e) => moveFocus(menuRef.current, ITEM, e.key) >= 0 && e.preventDefault()}
          className="absolute right-0 top-full z-30 mt-2 w-64 animate-rise-in rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          {items.map(({ key, icon: ItemIcon, label, run }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-testid={`composer-option-${key}`}
              onClick={() => {
                popover.close();
                run();
              }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label transition-colors duration-fast hover:bg-muted"
            >
              <ItemIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
