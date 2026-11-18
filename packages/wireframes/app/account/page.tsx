import { AccountHeader } from "@/components/account/account-header"
import { BalanceCard, type BalanceState } from "@/components/account/balance-card"
import { PurchasesList, RecentRuns, UsageByModel } from "@/components/account/history-lists"
import { Button } from "@/components/ui/button"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const STATES = ["signedOut", "empty", "ready", "low", "negative"] as const
type AccountState = (typeof STATES)[number]

const BALANCE: Record<Exclude<AccountState, "signedOut">, [BalanceState, string]> = {
  empty: ["low", "$0.00"],
  ready: ["ok", "$22.03"],
  low: ["low", "$0.42"],
  negative: ["negative", "-$14.60"],
}

/**
 * /account: the Pro usage dashboard (FR-041) in the workspace's AppShell.
 * Balance with buy buttons, purchases, usage by model and recent runs.
 * Signed out it shows the sign-in panel. `?state=` picks the wireframe state:
 * signedOut, empty (new account), ready (default), low, negative.
 */
export default async function AccountPage({ searchParams }: Props) {
  const raw = (await searchParams).state
  const state: AccountState = STATES.find((s) => s === raw) ?? "ready"

  return (
    <div className="flex min-h-dvh flex-col">
      <AccountHeader signedIn={state !== "signedOut"} />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-gutter py-8">
        <header className="space-y-1">
          <h1 className="font-display text-title font-normal">Account</h1>
          <p className="text-label text-muted-foreground">
            {state === "signedOut" ? "Sign in to see your credits and Pro usage." : "Signed in as ada@example.com"}
          </p>
        </header>
        {state === "signedOut" ? (
          <section className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-label font-semibold">Sign in for Pro</h2>
            <p className="text-caption text-muted-foreground">Pro runs models on our server and bills credits, so it needs an account. Free mode needs none.</p>
            <Button variant="outline" className="w-full">Continue with Google</Button>
            <div className="flex gap-2">
              <input aria-label="Email" placeholder="you@example.com" className="focus-ring h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-label" />
              <Button>Email me a link</Button>
            </div>
          </section>
        ) : (
          <>
            <BalanceCard state={BALANCE[state][0]} balance={BALANCE[state][1]} />
            <div className="grid gap-6 lg:grid-cols-2">
              <UsageByModel empty={state === "empty"} />
              <PurchasesList empty={state === "empty"} />
            </div>
            <RecentRuns empty={state === "empty"} />
          </>
        )}
      </main>
    </div>
  )
}
