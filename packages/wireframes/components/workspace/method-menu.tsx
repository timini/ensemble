import { Check, ChevronDown } from "lucide-react"
import { methods } from "@/lib/sample-run"
import { cn } from "@/lib/utils"

/** Consensus method dropdown. Every option shows its call count and cost before the run. */
export function MethodMenu({ open, selected = "standard" }: { open: boolean; selected?: string }) {
  const current = methods.find((m) => m.id === selected) ?? methods[0]
  return (
    <details className="group relative" open={open}>
      <summary className="focus-ring flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-3 text-label shadow-sm hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground">Method</span>
        <span className="font-medium">{current.name}</span>
        <span className="hidden text-caption text-muted-foreground sm:inline">· {current.calls} · {current.cost}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-rise-in rounded-xl border border-border bg-popover p-1.5 shadow-lg">
        <ul role="listbox" aria-label="Consensus method">
          {methods.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === current.id}>
              <button type="button" className={cn("focus-ring flex w-full gap-3 rounded-lg p-2.5 text-left hover:bg-muted", m.id === current.id && "bg-accent hover:bg-accent")}>
                <Check className={cn("mt-0.5 size-4 shrink-0 text-primary", m.id !== current.id && "invisible")} />
                <span className="flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-label font-medium">{m.name}</span>
                    <span className="text-caption tabular-nums text-muted-foreground">{m.calls}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
                    <span>{m.detail}</span>
                    <span className="shrink-0 tabular-nums">{m.cost}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-2.5 pb-1 pt-2.5 text-caption">
          <span className="text-muted-foreground">Merged by</span>
          <button type="button" className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium hover:bg-muted">
            Claude Opus 5.5 <ChevronDown className="size-3.5" />
          </button>
        </div>
        <p className="px-2.5 pb-1.5 text-caption text-muted-foreground">Counts include 3 answers and 3 embedding calls for the agreement score.</p>
      </div>
    </details>
  )
}
