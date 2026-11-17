'use client';

import '~/styles/globals.css';
import '~/lib/i18n'; // Initialize i18next

import { useEffect, useState } from 'react';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { TRPCReactProvider } from '~/trpc/react';
import { useStore } from '~/store';
import { useSyncStepWithRoute } from '~/hooks/useSyncStepWithRoute';
import { EnsembleHeader } from '@/components/molecules/EnsembleHeader';
import { Footer } from '@/components/molecules/Footer';
import { SettingsModal } from '@/components/organisms/SettingsModal';
import type { Theme, Language } from '@/components/organisms/SettingsModal';
import { initializeProviders } from '~/providers';
import { toError } from '~/lib/errors';
import { logger } from '~/lib/logger';

// tokens.css reads these variables in --font-sans, --font-mono and --font-display.
const sans = Geist({ subsets: ['latin'], variable: '--font-sans-loaded' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-loaded' });
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display-loaded',
});
const fontVariables = `${sans.variable} ${mono.variable} ${display.variable}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, language, setTheme, setLanguage } = useStore();
  const initializeEncryption = useStore((state) => state.initializeEncryption);
  const initializeEndpointKeys = useStore((state) => state.initializeEndpointKeys);
  const { i18n, t } = useTranslation('common');
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const fallbackTheme: Theme = 'light';
  const fallbackLanguage: Language = 'en';
  const resolvedTheme = hasHydrated ? theme : fallbackTheme;
  const resolvedLanguage = hasHydrated ? language : fallbackLanguage;

  useSyncStepWithRoute();

  // Initialize providers once on mount
  useEffect(() => {
    initializeProviders();
  }, []);
  useEffect(() => {
    void initializeEncryption();
    void initializeEndpointKeys();
  }, [initializeEncryption, initializeEndpointKeys]);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Sync language with i18next
  useEffect(() => {
    i18n.changeLanguage(language).catch((error: unknown) => {
      logger.error(
        'Failed to change language:',
        toError(error, 'Unable to change language'),
      );
    });
  }, [language, i18n]);

  // Ensure html lang attribute always reflects current language (hydration-safe)
  useEffect(() => {
    document.documentElement.setAttribute('lang', resolvedLanguage);
  }, [resolvedLanguage]);

  return (
    <html lang={resolvedLanguage} className={`${fontVariables} ${resolvedTheme}`}>
      <head>
        <title>Ensemble AI</title>
        <meta
          name="description"
          content="Make better decisions with multiple AI perspectives"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <TRPCReactProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {t('accessibility.skipToMainContent')}
          </a>
          <EnsembleHeader onSettingsClick={() => setSettingsOpen(true)} currentPath={pathname} />
          <main id="main-content">
            {children}
          </main>
          <Footer />
          <SettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            theme={resolvedTheme as Theme}
            onThemeChange={(newTheme) => setTheme(newTheme)}
            language={resolvedLanguage as Language}
            onLanguageChange={(newLang) => {
              // Only allow supported languages (en, fr)
              if (newLang === 'en' || newLang === 'fr') {
                setLanguage(newLang);
              }
            }}
            onClearData={() => {
              localStorage.removeItem('ensemble-ai-store');
              window.location.reload();
            }}
            onDone={() => setSettingsOpen(false)}
          />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
