import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { EnsembleHeader } from "@/components/ensemble-header"
import { Footer } from "@/components/footer"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "Ensemble AI Wireframes",
  description: "Wireframes for Ensemble AI free-mode and pro-mode planning",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
        <div className="flex min-h-screen flex-col">
          <EnsembleHeader />
          <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
