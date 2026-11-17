import * as React from 'react';

/** State and wiring for a non-modal popover returned by usePopover. */
export interface PopoverControls {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes the panel. Focus returns to the trigger unless `returnFocus` is false. */
  close: (returnFocus?: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** Id to put on the panel; the trigger points at it with aria-controls. */
  panelId: string;
  /** Spread on the trigger button. */
  triggerProps: {
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
  };
}

/**
 * Shared behaviour for the composer's menus (model picker, method menu,
 * options): toggle from a trigger, close on Escape or on a pointer down
 * outside, and give focus back to the trigger when closed from the keyboard.
 *
 * @example
 * ```tsx
 * const popover = usePopover();
 * <button ref={popover.triggerRef} {...popover.triggerProps}>Open</button>
 * {popover.open && <div ref={popover.panelRef} id={popover.panelId}>...</div>}
 * ```
 */
export function usePopover(initialOpen = false): PopoverControls {
  const [open, setOpen] = React.useState(initialOpen);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const panelId = React.useId();

  const close = React.useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    const panel = panelRef.current;
    document.addEventListener('pointerdown', onPointerDown);
    panel?.addEventListener('keydown', onKeyDown);
    triggerRef.current?.addEventListener('keydown', onKeyDown);
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      panel?.removeEventListener('keydown', onKeyDown);
      trigger?.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return {
    open,
    setOpen,
    close,
    triggerRef,
    panelRef,
    panelId,
    triggerProps: {
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: () => setOpen((value) => !value),
    },
  };
}
