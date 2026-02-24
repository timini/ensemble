"use client"

import { useState } from "react"
import Link from "next/link"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreditsBadge } from "@/components/credits-badge"
import { HistoryDrawer } from "@/components/history-drawer"

export function EnsembleHeader() {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

  // Wireframe toggle: change to true to preview signed-in state
  const isSignedIn = true

  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">Ensemble AI</h1>
          </Link>

          <nav className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Main navigation">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-1.5 text-muted-foreground"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>

            <CreditsBadge credits={47} isSignedIn={isSignedIn} />

            {isSignedIn ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
                  aria-label="Account menu"
                  aria-expanded={avatarMenuOpen}
                  aria-haspopup="true"
                >
                  JD
                </button>

                {avatarMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-border bg-background py-1 shadow-md">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} isSignedIn={isSignedIn} />
    </>
  )
}
