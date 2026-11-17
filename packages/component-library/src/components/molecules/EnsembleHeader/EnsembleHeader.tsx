import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../../atoms/Button';
import { cn } from '../../../lib/utils';

export interface EnsembleHeaderProps {
  /** Callback when settings icon is clicked */
  onSettingsClick?: () => void;
  /** Current page path for active link highlighting (e.g. '/features') */
  currentPath?: string;
  /** Where the brand leads. Defaults to the landing page, `/`. */
  homeHref?: string;
  /** Where the main action leads. Defaults to `/workspace`. */
  workspaceHref?: string;
}

/**
 * EnsembleHeader molecule: the header of the public pages (landing,
 * features, about, benchmarks). The brand leads home, the links lead to the
 * other public pages (hidden below 640 px, where the footer has them), the
 * gear opens theme and language, and "Open workspace" is the main action.
 *
 * @example
 * ```tsx
 * <EnsembleHeader currentPath="/features" onSettingsClick={openSettings} />
 * ```
 */
export function EnsembleHeader({
  onSettingsClick,
  currentPath,
  homeHref = '/',
  workspaceHref = '/workspace',
}: EnsembleHeaderProps) {
  const { t, i18n, ready } = useTranslation();
  const isReady = ready || i18n.isInitialized;
  const text = (key: string, fallback: string) => (isReady ? t(`ensemble.header.${key}`) : fallback);

  const links = [
    { href: '/features', label: text('features', 'Features') },
    { href: '/benchmarks', label: text('benchmarks', 'Benchmarks') },
    { href: '/about', label: text('about', 'About') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-gutter">
        <a href={homeHref} data-testid="site-header-home" className="focus-ring flex min-w-0 items-center gap-2 rounded-md">
          <svg viewBox="0 0 28 20" className="h-5 w-7 shrink-0 text-primary" aria-hidden="true">
            <circle cx="8" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="14" cy="10" r="7" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="20" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
          <span className="truncate font-display text-[1.375rem] font-normal leading-none text-foreground">
            {text('title', 'Ensemble AI')}
          </span>
        </a>
        <nav className="flex shrink-0 items-center gap-1" aria-label="Main navigation">
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={cn(
                'focus-ring hidden rounded-md px-3 py-2 text-label transition-colors duration-fast sm:block',
                currentPath === href ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={currentPath === href ? 'page' : undefined}
            >
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={onSettingsClick}
            className="focus-ring inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
            aria-label="Open settings"
          >
            <Settings className="size-5" />
          </button>
          <a href={workspaceHref} data-testid="site-header-workspace" className={cn(buttonVariants({ size: 'sm' }), 'ml-1 h-9')}>
            {text('workspace', 'Open workspace')}
          </a>
        </nav>
      </div>
    </header>
  );
}
