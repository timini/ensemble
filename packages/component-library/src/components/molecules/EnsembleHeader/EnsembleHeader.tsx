import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface EnsembleHeaderProps {
  /** Callback when settings icon is clicked */
  onSettingsClick?: () => void;
  /** Current page path for active link highlighting (e.g. '/features') */
  currentPath?: string;
}

export function EnsembleHeader({ onSettingsClick, currentPath }: EnsembleHeaderProps) {
  const { t, i18n, ready } = useTranslation();

  const isReady = ready || i18n.isInitialized;

  const title = isReady ? t('ensemble.header.title') : 'Ensemble AI';
  const tagline = isReady
    ? t('ensemble.header.tagline')
    : 'The smartest AI is an ensemble.';
  const aboutLabel = isReady ? t('ensemble.header.about') : 'About';
  const featuresLabel = isReady ? t('ensemble.header.features') : 'Features';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <a href="/config" className="focus-ring group flex min-w-0 items-center gap-2 rounded-md">
            <svg viewBox="0 0 28 20" className="h-5 w-7 shrink-0 text-primary" aria-hidden="true">
              <circle cx="8" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="14" cy="10" r="7" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="20" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
            <h1 className="truncate font-display text-[1.375rem] font-normal leading-none text-foreground">{title}</h1>
            <p className="ml-2 hidden truncate border-l border-border pl-3 text-label text-muted-foreground md:block">{tagline}</p>
          </a>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Main navigation">
            {[
              { href: '/features', label: featuresLabel },
              { href: '/about', label: aboutLabel },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`focus-ring rounded-md px-2 py-1.5 text-label transition-colors duration-fast ${
                  currentPath === href
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-current={currentPath === href ? 'page' : undefined}
              >
                {label}
              </a>
            ))}
            <button
              onClick={onSettingsClick}
              className="focus-ring inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
              aria-label="Open settings"
            >
              <Settings className="size-5" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
