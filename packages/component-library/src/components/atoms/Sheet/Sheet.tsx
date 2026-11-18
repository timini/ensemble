import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

export interface SheetProps {
  /** Whether the sheet is shown. */
  open: boolean;
  /** Called with false on Escape, the close button or a click on the overlay. */
  onOpenChange: (open: boolean) => void;
  /** Heading, also the dialog's accessible name. */
  title: string;
  /** Supporting line under the title, also the accessible description. */
  description?: string;
  /** Edge the panel opens from at 768 px and up. Below that it is always a bottom sheet. */
  side?: 'right' | 'left';
  children: React.ReactNode;
  /** Pinned action area under the scrolling body. */
  footer?: React.ReactNode;
  /** Defaults to `sheet`. */
  testId?: string;
  /**
   * What gets focus on open: the first control (default), or the panel
   * itself, so a sheet that opens on its own does not light up a control or
   * raise the keyboard on a phone. Tab still moves through the controls.
   */
  initialFocus?: 'first' | 'panel';
  className?: string;
}

/**
 * Sheet atom: a modal panel for settings, onboarding, manual answers and
 * history on small screens.
 *
 * Built on Radix Dialog, so it traps focus, closes on Escape and on the
 * overlay, and gives focus back to the control that had it before it
 * opened (or to the trigger), whatever opened it. From 768 px it slides in
 * from the side; below that it rises from the bottom with a grab handle.
 *
 * @example
 * ```tsx
 * <Sheet open={open} onOpenChange={setOpen} title={t('settings')}>
 *   <SettingsForm />
 * </Sheet>
 * ```
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  children,
  footer,
  testId = 'sheet',
  initialFocus = 'first',
  className,
}: SheetProps) {
  const { t } = useTranslation();
  // Radix gives focus back to a Dialog.Trigger, but these sheets are opened
  // from anywhere (header, setup card, menus), so remember what had focus.
  const returnFocus = React.useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-foreground/30 backdrop-blur-[2px] dark:bg-black/60" />
        <DialogPrimitive.Content
          data-testid={testId}
          data-side={side}
          onOpenAutoFocus={(event) => {
            const active = document.activeElement;
            returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
            if (initialFocus === 'panel') {
              event.preventDefault();
              (event.currentTarget as HTMLElement | null)?.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
          }}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] animate-rise-in flex-col rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-lg focus:outline-none',
            'md:inset-y-0 md:bottom-auto md:h-full md:max-h-none md:w-[440px] md:rounded-none md:border-y-0',
            side === 'right' ? 'md:left-auto md:right-0 md:border-r-0' : 'md:left-0 md:right-auto md:border-l-0',
            className,
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" aria-hidden="true" />
          <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-4 md:pt-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-heading">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-label text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              data-testid={`${testId}-close`}
              className="focus-ring -mr-2 shrink-0 rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">{t('atoms.sheet.close')}</span>
            </DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          {footer && (
            <footer data-testid="sheet-footer" className="border-t border-border px-6 py-4">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
