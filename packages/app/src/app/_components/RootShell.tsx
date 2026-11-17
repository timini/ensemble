"use client";

import "~/lib/i18n"; // Initialize i18next

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { TRPCReactProvider } from "~/trpc/react";
import { useStore } from "~/store";
import { EnsembleHeader } from "@/components/molecules/EnsembleHeader";
import { Footer } from "@/components/molecules/Footer";
import { SettingsModal } from "@/components/organisms/SettingsModal";
import type { Theme, Language } from "@/components/organisms/SettingsModal";
import { initializeProviders } from "~/providers";
import { toError } from "~/lib/errors";
import { logger } from "~/lib/logger";

/**
 * Client side of the root layout: theme, language, provider set-up and key
 * decryption, and the header, footer and settings modal of the public pages.
 * The workspace has its own frame (AppShell) and settings sheet. The theme
 * class and `lang` are applied to <html> after the store loads.
 */
export function RootShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, language, setTheme, setLanguage } = useStore();
  const initializeEncryption = useStore((state) => state.initializeEncryption);
  const initializeEndpointKeys = useStore(
    (state) => state.initializeEndpointKeys,
  );
  const { i18n, t } = useTranslation("common");
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The workspace has its own frame (AppShell) and settings sheet.
  const isWorkspace = pathname?.startsWith("/workspace") ?? false;
  const [hasHydrated, setHasHydrated] = useState(false);

  const fallbackTheme: Theme = "light";
  const fallbackLanguage: Language = "en";
  const resolvedTheme = hasHydrated ? theme : fallbackTheme;
  const resolvedLanguage = hasHydrated ? language : fallbackLanguage;

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
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Sync language with i18next
  useEffect(() => {
    i18n.changeLanguage(language).catch((error: unknown) => {
      logger.error(
        "Failed to change language:",
        toError(error, "Unable to change language"),
      );
    });
  }, [language, i18n]);

  // Ensure html lang attribute always reflects current language (hydration-safe)
  useEffect(() => {
    document.documentElement.setAttribute("lang", resolvedLanguage);
  }, [resolvedLanguage]);

  return (
    <TRPCReactProvider>
      {isWorkspace ? (
        children
      ) : (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {t("accessibility.skipToMainContent")}
          </a>
          <EnsembleHeader
            onSettingsClick={() => setSettingsOpen(true)}
            currentPath={pathname}
          />
          <main id="main-content">{children}</main>
          <Footer />
          <SettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            theme={resolvedTheme as Theme}
            onThemeChange={(newTheme) => setTheme(newTheme)}
            language={resolvedLanguage as Language}
            onLanguageChange={(newLang) => {
              // Only allow supported languages (en, fr)
              if (newLang === "en" || newLang === "fr") {
                setLanguage(newLang);
              }
            }}
            onClearData={() => {
              localStorage.removeItem("ensemble-ai-store");
              window.location.reload();
            }}
            onDone={() => setSettingsOpen(false)}
          />
        </>
      )}
    </TRPCReactProvider>
  );
}
