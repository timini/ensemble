import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface EnsembleHeaderProps {
  /** Callback when settings icon is clicked */
  onSettingsClick?: () => void;
}

export function EnsembleHeader({ onSettingsClick }: EnsembleHeaderProps) {
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {featuresLabel}
            </a>
            <a
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
