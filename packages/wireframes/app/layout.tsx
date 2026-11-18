import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import "./globals.css"

// The same families and variables as packages/app, read by tokens.css.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans-loaded" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-loaded" })
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display-loaded" })

export const metadata: Metadata = {
  title: "Ensemble wireframes",
  description: "Reference layouts for the Ensemble AI workspace (roadmap M4)",
}

// Follows the system theme; ?theme=dark or ?theme=light overrides it.
const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var d=q?q==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.add(d?'dark':'light')}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground">{children}</body>
    </html>
  )
}
