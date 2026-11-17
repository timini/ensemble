import { ChevronDown } from "lucide-react"
import { AgreementRing } from "@/components/ui/agreement-ring"
import { agreement, levelLabel } from "@/lib/sample-run"

/** Agreement score with its meaning and the pairwise scores behind it. */
export function AgreementPanel({ pending = false }: { pending?: boolean }) {
  if (pending) {
    return (
      <section aria-label="Agreement" className="rounded-2xl border border-border bg-card p-5">
        <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">Agreement</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="size-20 shrink-0 animate-pulse rounded-full border-8 border-muted" />
          <p className="text-label text-muted-foreground">Scored when all answers are in. 2 of 3 so far.</p>
        </div>
      </section>
    )
  }
  return (
    <section aria-labelledby="agreement-h" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="agreement-h" className="text-caption font-medium uppercase tracking-wider text-muted-foreground">Agreement</h2>
      <div className="mt-4 flex items-center gap-4">
        <AgreementRing score={agreement.score} level={agreement.level} size={80} />
        <div>
          <p className="text-heading text-success">{levelLabel[agreement.level]}</p>
          <p className="text-label text-muted-foreground">The answers say the same thing. The consensus is probably safe to use.</p>
        </div>
      </div>
      <div className="mt-5 hidden border-t border-border pt-4 lg:block">
        <PairList />
      </div>
      <details className="group mt-4 border-t border-border pt-3 lg:hidden">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between rounded text-label font-medium [&::-webkit-details-marker]:hidden">
          Scores for each pair
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
        </summary>
        <div className="pt-3"><PairList /></div>
      </details>
      <p className="mt-4 text-caption text-muted-foreground">Scored with {agreement.embeddings}.</p>
    </section>
  )
}

/** Pairwise similarity behind the overall score. */
function PairList() {
  return (
    <ul className="space-y-2.5">
      {agreement.pairs.map((p) => (
        <li key={p.a + p.b} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-caption">
          <span className="truncate text-muted-foreground">{p.a} and {p.b}</span>
          <span className="tabular-nums">{p.score.toFixed(2)}</span>
          <span className="col-span-2 h-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-success" style={{ width: `${p.score * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
