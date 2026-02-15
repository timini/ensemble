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
    <div className="bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <a href="/config" className="group block">
            <h1 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{title}</h1>
            <p className="text-muted-foreground mt-1">{tagline}</p>
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/features"
              className={`text-sm transition-colors ${currentPath === '/features' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              {...(currentPath === '/features' ? { 'aria-current': 'page' as const } : {})}
            >
              {featuresLabel}
            </a>
            <a
              href="/about"
              className={`text-sm transition-colors ${currentPath === '/about' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              {...(currentPath === '/about' ? { 'aria-current': 'page' as const } : {})}
            >
              {aboutLabel}
            </a>
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
