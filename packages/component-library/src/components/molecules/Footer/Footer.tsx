import { useTranslation } from 'react-i18next';

export interface FooterProps {
  /** GitHub repository URL */
  githubUrl?: string;
}

export function Footer({ githubUrl = 'https://github.com/timini/ensemble' }: FooterProps) {
  const { t, i18n, ready } = useTranslation();

  const isReady = ready || i18n.isInitialized;

  const year = new Date().getFullYear();

  const navLinks = [
    { href: '/config', label: isReady ? t('ensemble.footer.getStarted') : 'Get Started' },
    { href: '/features', label: isReady ? t('ensemble.footer.features') : 'Features' },
    { href: '/about', label: isReady ? t('ensemble.footer.about') : 'About' },
  ];

  return (
    <footer className="border-t border-border bg-background" data-testid="site-footer">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            {isReady
              ? t('ensemble.footer.copyright', { year })
              : `\u00A9 ${year} Ensemble AI`}
          </p>
        </div>
      </div>
    </footer>
  );
}
