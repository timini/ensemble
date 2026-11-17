import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { RootShell } from "./_components/RootShell";
import { SITE_DESCRIPTION, SITE_NAME } from "~/lib/siteMetadata";

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
 * language and page frame live in the client RootShell. `light` and `en` are
 * the defaults until the stored choices load.
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
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
