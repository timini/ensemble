"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, type CSSProperties } from "react";

const bodyStyles: CSSProperties = {
  margin: 0,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={bodyStyles}>
        <div style={wrapperStyles}>
          <h1 style={titleStyles}>Something went wrong</h1>
          <p style={descriptionStyles}>An unexpected error occurred. Please try again.</p>
          <button onClick={reset} style={buttonStyles}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
