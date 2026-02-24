"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const pastSessions = [
  { id: "1", prompt: "Key tradeoffs between single LLM and ensemble...", models: 2, time: "5m ago" },
  { id: "2", prompt: "Compare React vs Vue vs Svelte for enterprise...", models: 3, time: "2h ago" },
  { id: "3", prompt: "Explain quantum computing implications for...", models: 4, time: "1d ago" },
  { id: "4", prompt: "Best practices for microservices architecture...", models: 2, time: "3d ago" },
]

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  isSignedIn?: boolean
}

export function HistoryDrawer({ isOpen, onClose, isSignedIn = false }: HistoryDrawerProps) {
  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="History panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close history">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isSignedIn ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">Sign in to save your comparison history</p>
              <Button asChild variant="outline">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pastSessions.map((session) => (
                <Link key={session.id} href="/" className="block">
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardContent className="p-4">
                      <p className="truncate text-sm font-medium text-foreground">{session.prompt}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {session.models} model{session.models !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">{session.time}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Load more button (only when signed in) */}
        {isSignedIn && (
          <div className="border-t border-border px-6 py-4">
            <Button variant="outline" className="w-full">
              Load more
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}
