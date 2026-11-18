import type { ReactNode } from "react";

/**
 * Shared frame of the Open Graph images. ImageResponse cannot read the CSS
 * tokens, so the light theme's colours from component-library tokens.css
 * are repeated here as RGB values.
 */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  background: "rgb(250 250 247)",
  foreground: "rgb(24 26 25)",
  muted: "rgb(88 94 90)",
  primary: "rgb(14 104 92)",
  high: "rgb(22 117 58)",
  medium: "rgb(156 82 0)",
  low: "rgb(186 32 44)",
} as const;

/** The page frame: site name on top, `children` in the middle, a footer line. */
export function OgFrame({
  children,
  footer,
}: {
  children: ReactNode;
  footer: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: OG_COLORS.primary,
          }}
        />
        <div style={{ fontSize: 34, fontWeight: 600 }}>Ensemble AI</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {children}
      </div>
      <div style={{ fontSize: 26, color: OG_COLORS.muted }}>{footer}</div>
    </div>
  );
}
