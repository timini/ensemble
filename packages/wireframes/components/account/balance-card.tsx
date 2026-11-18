import { AlertCircle, AlertTriangle, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type BalanceState = "ok" | "low" | "negative"

const MESSAGES: Record<BalanceState, string> = {
  ok: "Pro runs are billed from this balance. Each run reserves its estimate first and you pay for what it used.",
  low: "Your balance is low. Buy credits to keep using Pro.",
  negative: "A payment was refunded or disputed after its credits were used, so your balance is below zero. Pro runs are paused until you buy credits.",
}

/** Balance, the state of the balance and a buy button per credit pack. */
export function BalanceCard({ state, balance }: { state: BalanceState; balance: string }) {
  const Icon = state === "ok" ? Coins : state === "low" ? AlertTriangle : AlertCircle
  return (
    <section
      aria-labelledby="balance-title"
      className={cn(
        "space-y-4 rounded-2xl border p-5",
        state === "ok" && "border-border bg-card",
        state === "low" && "border-warning/25 bg-warning/[0.06]",
        state === "negative" && "border-destructive/25 bg-destructive/[0.06]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id="balance-title" className="text-label text-muted-foreground">Credit balance</h2>
          <p className="font-display text-display leading-none tabular-nums">{balance}</p>
        </div>
        <Icon className={cn("mt-1 size-5", state === "ok" ? "text-muted-foreground" : state === "low" ? "text-warning" : "text-destructive")} />
      </div>
      <p className="max-w-prose text-label text-muted-foreground">{MESSAGES[state]}</p>
      <div className="flex flex-wrap items-center gap-2">
        {["$5", "$20", "$50"].map((p) => (
          <Button key={p} variant={state === "ok" ? "outline" : "primary"} size="sm">Buy {p}</Button>
        ))}
        <span className="text-caption text-muted-foreground">Paid with Stripe. Credits arrive once the payment clears.</span>
      </div>
    </section>
  )
}
