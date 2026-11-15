import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"
import { StatePanel } from "@/components/pro/state-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { mockChatMessagesBySession, mockChatSessions } from "@/lib/pro-mock-data"

type ChatViewState = "success" | "loading" | "error"
type RawSearchParams = Record<string, string | string[] | undefined>

type ProChatDetailPageProps = {
  params: Promise<{ sessionId: string }>
  searchParams?: Promise<RawSearchParams>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getChatState(value: string | undefined): ChatViewState {
  return value === "loading" || value === "error" ? value : "success"
}

export default async function ProChatDetailPage({ params, searchParams }: ProChatDetailPageProps) {
  const { sessionId } = await params
  const resolvedParams = (await searchParams) ?? {}

  const chatState = getChatState(firstValue(resolvedParams.state))
  const session = mockChatSessions.find((item) => item.id === sessionId)
  const messages = mockChatMessagesBySession[sessionId] ?? []

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/pro/history">
            <ArrowLeft className="h-4 w-4" />
            Back to history
          </Link>
        </Button>

        <div className="flex gap-2 text-xs">
          <Link className="rounded-full border px-3 py-1 hover:border-primary/50" href={`/pro/chats/${sessionId}?state=success`}>
            State: success
          </Link>
          <Link className="rounded-full border px-3 py-1 hover:border-primary/50" href={`/pro/chats/${sessionId}?state=loading`}>
            State: loading
          </Link>
          <Link className="rounded-full border px-3 py-1 hover:border-primary/50" href={`/pro/chats/${sessionId}?state=error`}>
            State: error
          </Link>
        </div>
      </div>

      {!session && <StatePanel state="error" description="Session not found. Return to history and choose another session." />}

      {session && (
        <>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold tracking-tight">{session.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {session.messageCount} messages - {session.totalCredits} credits used - updated {session.updatedAt}
              </p>
            </CardContent>
          </Card>

          <div className="mt-6">
            {chatState === "loading" && <StatePanel state="loading" description="Loading conversation transcript..." />}
            {chatState === "error" && (
              <StatePanel
                state="error"
                description="Failed to load this conversation. Retry or reopen from history."
                actionHref={`/pro/chats/${sessionId}?state=success`}
                actionLabel="Retry"
              />
            )}

            {chatState === "success" && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-md border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {message.role === "user" ? "User" : `${message.provider} - ${message.model}`}
                      </p>
                      <p className="mt-2 text-sm text-foreground">{message.content}</p>
                    </div>
                  ))}

                  <div className="border-t pt-4">
                    <p className="mb-2 text-sm font-medium">Continue this chat</p>
                    <Textarea
                      className="min-h-[100px]"
                      placeholder="Wireframe: continue prompting from this prior context..."
                      readOnly
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Submission is handled in app integration stage.</p>
                      <Button disabled>
                        <Send className="h-4 w-4" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
