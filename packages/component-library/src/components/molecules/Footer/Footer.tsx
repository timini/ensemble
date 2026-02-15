import { useTranslation } from 'react-i18next';

export interface FooterProps {
  /** GitHub repository URL */
  githubUrl?: string;
}

export function Footer({ githubUrl = 'https://github.com/timini/ensemble' }: FooterProps) {
  const { t } = useTranslation();

  const year = new Date().getFullYear();

  const navLinks = [
    { href: '/config', label: t('ensemble.footer.getStarted') },
    { href: '/features', label: t('ensemble.footer.features') },
    { href: '/about', label: t('ensemble.footer.about') },
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
              {t('ensemble.footer.github')}
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('ensemble.footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
