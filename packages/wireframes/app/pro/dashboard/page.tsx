import Link from "next/link"
import { ArrowRight, CreditCard, Gauge, History, TriangleAlert } from "lucide-react"
import { CreditBadge } from "@/components/pro/credit-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCreditBalance, mockChatSessions } from "@/lib/pro-mock-data"

const balance = getCreditBalance("low")

export default function ProDashboardPage() {
  const recentSessions = mockChatSessions.slice(0, 2)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-5">
        <p className="text-sm font-medium text-primary">Pro Mode dashboard</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          This wireframe shows credits, usage, and history entrypoints with core state coverage for happy and failure
          paths.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CreditBadge credit={balance} />
          <span className="text-xs text-muted-foreground">Updated {balance.updatedAt}</span>
        </div>

        {balance.level !== "healthy" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="inline-flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {balance.level === "low"
                ? "Low-credit warning: purchase soon to avoid blocked submissions."
                : "Insufficient credits: prompt submission is currently blocked."}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Credits</h3>
            <p className="mt-2 text-sm text-muted-foreground">Balance, warnings, and purchase flow placeholders.</p>
            <Button className="mt-4 w-full" asChild>
              <Link href="/pro/usage">View credits in usage</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Gauge className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Usage</h3>
            <p className="mt-2 text-sm text-muted-foreground">Inspect request history with loading, empty, and error states.</p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/pro/usage?state=loading">View loading state</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <History className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Past chats</h3>
            <p className="mt-2 text-sm text-muted-foreground">List, reopen, and delete with edge-state views.</p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/pro/history">Open history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">Recent chats</h3>
            <div className="mt-4 space-y-3">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/pro/chats/${session.id}`}
                  className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:border-primary/50"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-muted-foreground">{session.updatedAt}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">State shortcuts</h3>
            <div className="mt-4 space-y-2 text-sm">
              <Link className="block text-primary hover:underline" href="/pro/usage?balance=insufficient&state=error">
                Insufficient credits + usage error
              </Link>
              <Link className="block text-primary hover:underline" href="/pro/usage?purchase=success">
                Purchase success state
              </Link>
              <Link className="block text-primary hover:underline" href="/pro/history?state=empty">
                Empty history state
              </Link>
              <Link className="block text-primary hover:underline" href="/pro/history?state=error">
                History API failure state
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
