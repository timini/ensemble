"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation("common");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      data-testid="route-error-boundary"
      className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center"
    >
      <h2 className="mb-2 text-xl font-semibold">
        {t("errors.routeError.title")}
      </h2>
      <p className="mb-6 text-muted-foreground">
        {t("errors.routeError.description")}
      </p>
      <button
        onClick={reset}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-card/80"
      >
        {t("errors.routeError.tryAgain")}
      </button>
    </div>
  );
}
