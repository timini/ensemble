'use client';

import '~/styles/globals.css';
import '~/lib/i18n'; // Initialize i18next

import { useEffect, useState } from 'react';
import { Geist } from 'next/font/google';
import { useTranslation } from 'react-i18next';
import { TRPCReactProvider } from '~/trpc/react';
import { useStore } from '~/store';
import { useSyncStepWithRoute } from '~/hooks/useSyncStepWithRoute';
import { EnsembleHeader } from '@/components/molecules/EnsembleHeader';
import { SettingsModal } from '@/components/organisms/SettingsModal';
import type { Theme, Language } from '@/components/organisms/SettingsModal';
import { initializeProviders } from '~/providers';
import { toError } from '~/lib/errors';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, language, setTheme, setLanguage } = useStore();
  const initializeEncryption = useStore((state) => state.initializeEncryption);
  const { i18n } = useTranslation();
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
  }, [initializeEncryption]);
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
      console.error(
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
    <html lang={resolvedLanguage} className={`${geist.variable} ${resolvedTheme}`}>
      <head>
        <title>Ensemble AI</title>
        <meta
          name="description"
          content="Make better decisions with multiple AI perspectives"
        />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              if (typeof window === 'undefined') return;
              try {
                const navigationEntries = performance.getEntriesByType('navigation');
                const navType = navigationEntries && navigationEntries[0] ? navigationEntries[0].type : undefined;
                if (window.location.pathname === '/review' && navType === 'navigate') {
                  const raw = window.localStorage.getItem('ensemble-ai-store');
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                      parsed.prompt = null;
                      parsed.responses = [];
                      parsed.manualResponses = [];
                      parsed.embeddings = [];
                      parsed.similarityMatrix = null;
                      parsed.agreementStats = null;
                      parsed.metaAnalysis = null;
                    }
                    window.localStorage.setItem('ensemble-ai-store', JSON.stringify(parsed));
                  }
                }
              } catch (error) {
                console.error(
                  'Failed to clear stale review state',
                  toError(error, 'Failed to clear stale review state'),
                );
              }
            })();`,
          }}
        />
      </head>
      <body>
        <TRPCReactProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
          >
            Skip to main content
          </a>
          <EnsembleHeader onSettingsClick={() => setSettingsOpen(true)} />
          <main id="main-content">{children}</main>
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
