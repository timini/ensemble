"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/lib/i18n";

const bodyStyles: CSSProperties = {
  margin: 0,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
};

const wrapperStyles: CSSProperties = {
  textAlign: "center",
  padding: "2rem",
};

const titleStyles: CSSProperties = {
  fontSize: "1.5rem",
  marginBottom: "0.5rem",
};

const descriptionStyles: CSSProperties = {
  color: "#a1a1aa",
  marginBottom: "1.5rem",
};

const buttonStyles: CSSProperties = {
  padding: "0.5rem 1.5rem",
  borderRadius: "0.375rem",
  border: "1px solid #27272a",
  backgroundColor: "#18181b",
  color: "#fafafa",
  cursor: "pointer",
  fontSize: "0.875rem",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The root layout is gone, so use the app's i18n instance directly; it
  // keeps the language the visitor chose.
  const { t } = useTranslation("common", { i18n });

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={i18n.language || "en"}>
      <body style={bodyStyles}>
        <div style={wrapperStyles}>
          <h1 style={titleStyles}>{t("errors.routeError.title")}</h1>
          <p style={descriptionStyles}>{t("errors.routeError.description")}</p>
          <button onClick={reset} style={buttonStyles}>
            {t("errors.routeError.tryAgain")}
          </button>
        </div>
      </body>
    </html>
  );
}
