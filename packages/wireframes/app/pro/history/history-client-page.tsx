"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ExternalLink, Search } from "lucide-react"
import { HistoryListItem } from "@/components/pro/history-list-item"
import { StatePanel } from "@/components/pro/state-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { mockChatMessagesBySession, mockChatSessions } from "@/lib/pro-mock-data"
import type { AsyncViewState, ChatSessionListItemView } from "@/lib/pro-types"

const historyStateOptions: AsyncViewState[] = ["success", "loading", "empty", "error"]

interface ProHistoryClientPageProps {
  historyState: AsyncViewState
}

export function ProHistoryClientPage({ historyState }: ProHistoryClientPageProps) {
  const [query, setQuery] = useState("")
  const [sessions, setSessions] = useState<ChatSessionListItemView[]>(mockChatSessions)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(mockChatSessions[0]?.id ?? "")
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const filteredSessions = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return sessions
    return sessions.filter((session) => session.title.toLowerCase().includes(value))
  }, [query, sessions])

  const selectedSession = filteredSessions.find((session) => session.id === selectedSessionId) ?? filteredSessions[0]
  const selectedMessages = selectedSession ? mockChatMessagesBySession[selectedSession.id] ?? [] : []

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return

    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== pendingDeleteId)
      if (selectedSessionId === pendingDeleteId) {
        setSelectedSessionId(next[0]?.id ?? "")
      }
      return next
    })
    setPendingDeleteId(null)
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Pro Mode</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Past chats</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Browse session history, reopen previous work, and test delete interaction states.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {historyStateOptions.map((state) => (
            <Link
              key={state}
              className="rounded-full border px-3 py-1 transition-colors hover:border-primary/50"
              href={`/pro/history?state=${state}`}
            >
              State: {state}
            </Link>
          ))}
        </div>
      </div>

      {historyState === "loading" && (
        <div className="mt-8">
          <StatePanel state="loading" description="Loading chat sessions..." />
        </div>
      )}

      {historyState === "empty" && (
        <div className="mt-8">
          <StatePanel
            state="empty"
            description="No prior chats yet. Start from Ensemble to create your first Pro session."
            actionHref="/ensemble"
            actionLabel="Start new comparison"
          />
        </div>
      )}

      {historyState === "error" && (
        <div className="mt-8">
          <StatePanel
            state="error"
            description="Could not load history. Try again or check backend availability."
            actionHref="/pro/history?state=success"
            actionLabel="Retry history"
          />
        </div>
      )}

      {historyState === "success" && (
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1.8fr]">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Session list</h3>
                <span className="text-xs text-muted-foreground">{filteredSessions.length} sessions</span>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by title"
                  className="pl-9"
                />
              </div>

              {filteredSessions.length === 0 ? (
                <StatePanel state="empty" description="No sessions match this filter." />
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map((session) => (
                    <HistoryListItem
                      key={session.id}
                      session={session}
                      isSelected={session.id === selectedSession?.id}
                      onSelect={setSelectedSessionId}
                      onDelete={setPendingDeleteId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {!selectedSession ? (
                <StatePanel state="empty" description="Select a session to view details." />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedSession.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Updated {selectedSession.updatedAt}</p>
                    </div>
                    <Button asChild>
                      <Link href={`/pro/chats/${selectedSession.id}`}>
                        Reopen
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <p className="mt-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{selectedSession.preview}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <span>{selectedSession.messageCount} messages</span>
                    <span>{selectedSession.totalCredits} credits consumed</span>
                    <span>Status: {selectedSession.status}</span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-semibold">Recent messages</p>
                    {selectedMessages.length === 0 ? (
                      <StatePanel state="empty" description="No messages snapshot for this session yet." />
                    ) : (
                      selectedMessages.map((message) => (
                        <div key={message.id} className="rounded-md border p-3 text-sm">
                          <p className="font-medium">
                            {message.role === "user" ? "User" : `${message.provider} (${message.model})`}
                          </p>
                          <p className="mt-1 text-muted-foreground">{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteId && historyState === "success" && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Delete this chat session?</p>
          <p className="mt-1">This is a wireframe confirmation state for delete/archive behavior.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>
              Confirm delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
