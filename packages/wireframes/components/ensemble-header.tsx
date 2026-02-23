"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

const links = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
]

export function EnsembleHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <Link href="/config" className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">Ensemble AI</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">The smartest AI is an ensemble.</p>
        </Link>

        <nav className="flex shrink-0 items-center gap-2 sm:gap-4" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            aria-label="Open settings"
            className="rounded-md p-2 transition-colors hover:bg-accent"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </nav>
      </div>
    </header>
  )
}
