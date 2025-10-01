'use client';

import '~/styles/globals.css';
import '~/lib/i18n'; // Initialize i18next

import { useEffect, useState } from 'react';
import { Geist } from 'next/font/google';
import { useTranslation } from 'react-i18next';
import { TRPCReactProvider } from '~/trpc/react';
import { useStore } from '~/store';
import { EnsembleHeader } from '@/components/molecules/EnsembleHeader';
import { SettingsModal } from '@/components/organisms/SettingsModal';
import type { Theme, Language } from '@/components/organisms/SettingsModal';
import { initializeProviders } from '~/providers';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, language, setTheme, setLanguage } = useStore();
  const { i18n } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize providers once on mount
  useEffect(() => {
    initializeProviders();
  }, []);

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Sync language with i18next
  useEffect(() => {
    i18n.changeLanguage(language).catch((error) => {
      console.error('Failed to change language:', error);
    });
  }, [language, i18n]);

  return (
    <html lang={language} className={`${geist.variable} ${theme}`}>
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
          <EnsembleHeader onSettingsClick={() => setSettingsOpen(true)} />
          {children}
          <SettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            theme={theme as Theme}
            onThemeChange={(newTheme) => setTheme(newTheme)}
            language={language as Language}
            onLanguageChange={(newLang) => {
              // Only allow supported languages (en, fr)
              if (newLang === 'en' || newLang === 'fr') {
                setLanguage(newLang);
              }
            }}
            onDone={() => setSettingsOpen(false)}
          />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
