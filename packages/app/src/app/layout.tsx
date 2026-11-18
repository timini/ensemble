import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { RootShell } from "./_components/RootShell";
import { SITE_DESCRIPTION, SITE_NAME } from "~/lib/siteMetadata";
import { THEME_SCRIPT } from "~/lib/themeScript";

// tokens.css reads these variables in --font-sans, --font-mono and --font-display.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans-loaded" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-loaded" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display-loaded",
});
const fontVariables = `${sans.variable} ${mono.variable} ${display.variable}`;

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
};

/**
 * Root layout. A server component so pages can export metadata; the theme,
 * language and page frame live in the client RootShell. A small script in
 * <head> applies the stored theme, or the system's on a first visit, before
 * the first paint. `en` is the language until the stored or browser choice
 * loads.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fontVariables} light`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
