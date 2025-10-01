'use client';

import '~/styles/globals.css';
import '~/lib/i18n'; // Initialize i18next

import { useEffect } from 'react';
import { Geist } from 'next/font/google';
import { useTranslation } from 'react-i18next';
import { TRPCReactProvider } from '~/trpc/react';
import { useStore } from '~/store';
import { EnsembleHeader } from '@/components/molecules/EnsembleHeader';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, language } = useStore();
  const { i18n } = useTranslation();

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
          <EnsembleHeader />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
