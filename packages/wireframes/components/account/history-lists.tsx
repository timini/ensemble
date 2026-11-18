import { Button } from "@/components/ui/button"

/** A titled card with a list and an optional Show more. */
function ListCard({ title, empty, more, children }: { title: string; empty?: string; more?: boolean; children?: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-label font-semibold">{title}</h2>
      {empty ? <p className="text-label text-muted-foreground">{empty}</p> : <ul className="divide-y divide-border">{children}</ul>}
      {more && <Button variant="ghost" size="sm">Show more</Button>}
    </section>
  )
}

const PURCHASES = [
  ["Refund of the $20 pack", "12 Nov 2026", "-$20.00", true],
  ["$20 pack", "3 Nov 2026", "+$20.00", false],
  ["$5 pack", "28 Oct 2026", "+$5.00", false],
] as const

/** Purchases, refunds, disputes and grants, newest first. */
export function PurchasesList({ empty }: { empty?: boolean }) {
  return (
    <ListCard title="Purchases" empty={empty ? "No purchases yet." : undefined} more>
      {PURCHASES.map(([what, when, amount, negative]) => (
        <li key={what} className="flex items-center justify-between gap-4 py-2.5">
          <div>
            <p className="text-label">{what}</p>
            <p className="text-caption text-muted-foreground">{when}</p>
          </div>
          <span className={`font-mono text-label tabular-nums ${negative ? "text-destructive" : ""}`}>{amount}</span>
        </li>
      ))}
    </ListCard>
  )
}

const MODELS = [
  ["Claude Sonnet 5.5", "14 runs, 41 calls, 182k tokens", "$1.84", 0.62],
  ["GPT-6 Luna", "14 runs, 14 calls, 51k tokens", "$0.71", 0.24],
  ["Gemini 3.5 Flash Lite", "11 runs, 30 calls, 96k tokens", "$0.42", 0.14],
] as const

/** Credits per model over the last 30 days, with a bar for the share. */
export function UsageByModel({ empty }: { empty?: boolean }) {
  return (
    <ListCard title="Usage by model, last 30 days" empty={empty ? "No Pro runs in the last 30 days." : undefined}>
      {MODELS.map(([name, detail, cost, share]) => (
        <li key={name} className="space-y-1.5 py-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-label">{name}</p>
            <span className="font-mono text-label tabular-nums">{cost}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} /></div>
          <p className="text-caption text-muted-foreground">{detail}</p>
        </li>
      ))}
    </ListCard>
  )
}

const RUNS = [
  ["Today, 09:41", "Claude Sonnet 5.5, GPT-6 Luna, Gemini 3.5 Flash Lite", "7 calls", "$0.09"],
  ["Yesterday, 17:02", "Claude Sonnet 5.5, GPT-6 Luna", "4 calls", "$0.05"],
  ["10 Nov 2026, 11:15", "Claude Sonnet 5.5, GPT-6 Luna, Gemini 3.5 Flash Lite", "9 calls", "$0.12"],
] as const

/** Settled Pro runs, newest first. */
export function RecentRuns({ empty }: { empty?: boolean }) {
  return (
    <ListCard title="Recent runs" empty={empty ? "Runs you make in Pro show here with what they cost." : undefined} more>
      {RUNS.map(([when, models, calls, cost]) => (
        <li key={when} className="flex items-start justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="text-label">{when}</p>
            <p className="truncate text-caption text-muted-foreground">{models} · {calls}</p>
          </div>
          <span className="font-mono text-label tabular-nums">{cost}</span>
        </li>
      ))}
    </ListCard>
  )
}
