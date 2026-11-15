import Link from "next/link"
import { AlertTriangle, ArrowUpRight, ReceiptText } from "lucide-react"
import { CreditBadge } from "@/components/pro/credit-badge"
import { StatePanel } from "@/components/pro/state-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCreditBalance, getCreditPurchaseState, mockUsageHistory } from "@/lib/pro-mock-data"
import type { AsyncViewState, CreditLevel } from "@/lib/pro-types"

const usageStateOptions: AsyncViewState[] = ["success", "loading", "empty", "error"]
const balanceOptions: CreditLevel[] = ["healthy", "low", "insufficient"]
const purchaseOptions = ["idle", "loading", "success", "error"] as const

type RawSearchParams = Record<string, string | string[] | undefined>

type UsagePageProps = {
  searchParams?: Promise<RawSearchParams>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getUsageState(value: string | undefined): AsyncViewState {
  return usageStateOptions.includes(value as AsyncViewState) ? (value as AsyncViewState) : "success"
}

function getBalanceState(value: string | undefined): CreditLevel {
  return balanceOptions.includes(value as CreditLevel) ? (value as CreditLevel) : "low"
}

function getPurchaseState(value: string | undefined) {
  return purchaseOptions.includes(value as (typeof purchaseOptions)[number])
    ? (value as (typeof purchaseOptions)[number])
    : "idle"
}

export default async function ProUsagePage({ searchParams }: UsagePageProps) {
  const resolvedParams = (await searchParams) ?? {}

  const usageState = getUsageState(firstValue(resolvedParams.state))
  const balanceState = getBalanceState(firstValue(resolvedParams.balance))
  const purchaseState = getPurchaseState(firstValue(resolvedParams.purchase))

  const credit = getCreditBalance(balanceState)
  const purchase = getCreditPurchaseState(purchaseState)

  const lowWarning = credit.level === "low"
  const blocked = credit.level === "insufficient"

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Pro Mode</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Usage and credits</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Wireframe states for credit status, purchase flow, and request history surfaces.
          </p>
        </div>
        <CreditBadge credit={credit} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {usageStateOptions.map((state) => (
          <Link
            key={state}
            className="rounded-full border px-3 py-1 transition-colors hover:border-primary/50"
            href={`/pro/usage?state=${state}&balance=${balanceState}&purchase=${purchaseState}`}
          >
            Usage: {state}
          </Link>
        ))}
        {balanceOptions.map((balance) => (
          <Link
            key={balance}
            className="rounded-full border px-3 py-1 transition-colors hover:border-primary/50"
            href={`/pro/usage?state=${usageState}&balance=${balance}&purchase=${purchaseState}`}
          >
            Balance: {balance}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">Credit health</h3>
            <p className="mt-2 text-sm text-muted-foreground">Current balance {credit.balance} credits.</p>
            {lowWarning && (
              <p className="mt-4 inline-flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Low credit warning: top up before your next run.
              </p>
            )}
            {blocked && (
              <p className="mt-4 inline-flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Submission blocked. Purchase credits to continue.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/pro/usage?state=${usageState}&balance=${balanceState}&purchase=loading`}>Buy credits</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/pro/history">View chat history</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Purchase credits</h3>
              <span className="text-xs text-muted-foreground">
                ${purchase.packagePriceUsd} / {purchase.packageCredits} credits
              </span>
            </div>
            {purchase.status === "idle" && (
              <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm">
                <p>{purchase.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/pro/usage?state=${usageState}&balance=${balanceState}&purchase=loading`}>Open checkout</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/pro/usage?state=${usageState}&balance=${balanceState}&purchase=error`}>
                      Simulate failure
                    </Link>
                  </Button>
                </div>
              </div>
            )}
            {purchase.status !== "idle" && (
              <div className="mt-4">
                <StatePanel
                  state={purchase.status === "loading" ? "loading" : purchase.status === "error" ? "error" : "success"}
                  title="Credit purchase"
                  description={purchase.message}
                  actionHref={`/pro/usage?state=${usageState}&balance=${balanceState}&purchase=idle`}
                  actionLabel="Reset purchase state"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {purchaseOptions.map((option) => (
                <Link
                  key={option}
                  className="rounded-full border px-3 py-1 transition-colors hover:border-primary/50"
                  href={`/pro/usage?state=${usageState}&balance=${balanceState}&purchase=${option}`}
                >
                  Purchase: {option}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Usage history</h3>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
              Last 3 requests
            </span>
          </div>

          {usageState === "loading" && <StatePanel state="loading" description="Fetching usage records from backend..." />}
          {usageState === "empty" && (
            <StatePanel
              state="empty"
              description="No usage records yet. Run your first Pro request to populate this table."
              actionHref="/ensemble"
              actionLabel="Start comparison"
            />
          )}
          {usageState === "error" && (
            <StatePanel
              state="error"
              description="Usage service failed to load. Retry or check system status."
              actionHref={`/pro/usage?state=success&balance=${balanceState}&purchase=${purchaseState}`}
              actionLabel="Retry"
            />
          )}

          {usageState === "success" && (
            <div className="space-y-3">
              {mockUsageHistory.map((item) => (
                <div key={item.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {item.provider} · {item.model}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.promptSummary}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.timestamp}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span>{item.tokens} tokens</span>
                    <span>{item.creditCost} credits</span>
                    <span className={item.status === "failed" ? "text-destructive" : "text-emerald-600"}>
                      {item.status}
                    </span>
                    <Link href="/pro/history" className="inline-flex items-center gap-1 text-primary hover:underline">
                      View related chat
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
