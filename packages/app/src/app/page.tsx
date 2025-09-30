'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

/**
 * Landing page
 *
 * Automatically redirects to /config (Step 1 of workflow)
 * Shows loading message while redirecting
 */
export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Redirect to config page after brief delay
    const timer = setTimeout(() => {
      router.push('/config');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--color-foreground)] mb-4">
          {t('app.name')}
        </h1>
        <p className="text-[var(--color-muted)]">{t('common.loading')}</p>
      </div>
    </main>
  );
}
