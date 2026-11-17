import { Copy, Share2 } from "lucide-react"
import { consensus } from "@/lib/sample-run"

/** The merged answer, with how it was made and what the run cost. */
export function ConsensusCard({ pending = false }: { pending?: boolean }) {
  return (
    <section aria-labelledby="consensus-h" className="flex flex-col rounded-2xl border border-primary/25 bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <h2 id="consensus-h" className="text-caption font-medium uppercase tracking-wider text-primary">Consensus answer</h2>
        <p className="text-caption text-muted-foreground">Standard · merged by Claude Opus 5.5</p>
      </header>
      {pending ? (
        <div className="space-y-2.5 px-5 py-5" aria-label="Waiting for answers">
          {[100, 92, 96, 60].map((w) => (
            <div key={w} className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3 px-5 py-4 text-body">
          {consensus.map((p) => <p key={p}>{p}</p>)}
        </div>
      )}
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border px-5 py-3">
        <p className="text-caption tabular-nums text-muted-foreground">{pending ? "Estimated 7 calls · about $0.01" : "7 calls · $0.011 · 6.2 s"}</p>
        <div className="flex gap-1">
          <button type="button" disabled={pending} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label hover:bg-muted disabled:opacity-50"><Copy className="size-4" /> Copy</button>
          <button type="button" disabled={pending} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label hover:bg-muted disabled:opacity-50"><Share2 className="size-4" /> Share</button>
        </div>
      </footer>
    </section>
  )
}
