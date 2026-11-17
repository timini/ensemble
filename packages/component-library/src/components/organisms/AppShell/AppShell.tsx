import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { History, Settings } from 'lucide-react';
import { Logo } from '../../atoms/Logo';
import { Sheet } from '../../atoms/Sheet';
import { cn } from '../../../lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  /** History and presets. A sidebar from 1024 px, a sheet from the left below. */
  sidebar?: React.ReactNode;
  /** Where the logo leads. Defaults to `/`. */
  homeHref?: string;
  /** Header links before the settings button, such as Benchmarks. */
  nav?: React.ReactNode;
  /** Account area at the right end of the header (sign in, credits). */
  account?: React.ReactNode;
  onOpenSettings?: () => void;
  /** Controls the mobile history sheet, for closing it after a pick. */
  historyOpen?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
  /** Desktop sidebar state on first render. Defaults to open. */
  defaultSidebarOpen?: boolean;
  className?: string;
}

const DESKTOP = '(min-width: 1024px)';
const ICON_BUTTON =
  'focus-ring inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground';

function useIsDesktop() {
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia?.(DESKTOP);
    if (!query) return undefined;
    setDesktop(query.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return desktop;
}

/**
 * AppShell organism: the frame of the workspace. A sticky header with the
 * history toggle, the logo, optional links, settings and an account slot;
 * the history sidebar on desktop (collapsible) or in a sheet on smaller
 * screens; and the main content with a skip link to it.
 *
 * @example
 * ```tsx
 * <AppShell sidebar={<HistorySidebar ... />} onOpenSettings={openSettings} account={<SignInButton />}>
 *   <Workspace />
 * </AppShell>
 * ```
 */
export function AppShell(props: AppShellProps) {
  const { children, sidebar, homeHref = '/' } = props;
  const { t } = useTranslation();
  const mainId = React.useId();
  const desktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = React.useState(props.defaultSidebarOpen ?? true);
  const [sheetState, setSheetState] = React.useState(false);
  const sheetOpen = props.historyOpen ?? sheetState;
  const setSheetOpen = (open: boolean) => {
    setSheetState(open);
    props.onHistoryOpenChange?.(open);
  };
  const expanded = desktop ? sidebarOpen : sheetOpen;

  return (
    <div data-testid="app-shell" data-sidebar-open={String(sidebarOpen)} className={cn('flex min-h-dvh flex-col bg-background text-foreground', props.className)}>
      <a href={`#${mainId}`} className="focus-ring sr-only z-50 rounded-lg bg-card px-3 py-2 text-label focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {t('organisms.appShell.skip')}
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-gutter lg:px-4">
          {sidebar && (
            <button
              type="button"
              onClick={() => (desktop ? setSidebarOpen((v) => !v) : setSheetOpen(true))}
              aria-expanded={expanded}
              aria-label={expanded ? t('organisms.appShell.hideHistory') : t('organisms.appShell.showHistory')}
              data-testid="app-shell-history-toggle"
              className={cn(ICON_BUTTON, '-ml-2')}
            >
              <History className="size-5" aria-hidden="true" />
            </button>
          )}
          <a href={homeHref} aria-label={t('atoms.logo.home')} className="focus-ring rounded-md">
            <Logo />
          </a>
          <div className="ml-auto flex items-center gap-1">
            {props.nav}
            {props.onOpenSettings && (
              <button type="button" onClick={props.onOpenSettings} aria-label={t('organisms.appShell.settings')} data-testid="app-shell-settings" className={ICON_BUTTON}>
                <Settings className="size-5" aria-hidden="true" />
              </button>
            )}
            {props.account}
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        {sidebar && sidebarOpen && (
          <aside
            aria-label={t('organisms.appShell.history')}
            data-testid="app-shell-sidebar"
            className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r border-border bg-card/40 p-3 lg:block"
          >
            {sidebar}
          </aside>
        )}
        <main id={mainId} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
      {sidebar && !desktop && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={t('organisms.appShell.history')} side="left" testId="app-shell-history-sheet">
          {sidebar}
        </Sheet>
      )}
    </div>
  );
}
