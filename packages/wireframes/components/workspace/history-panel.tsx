import Link from "next/link"
import { Cloud, HardDrive, Layers, Plus, Search, Share2, Trash2 } from "lucide-react"
import { LevelDot } from "@/components/ui/agreement-ring"
import { history, levelLabel, presets } from "@/lib/sample-run"
import { cn } from "@/lib/utils"

const rowAction = "focus-ring invisible rounded-md p-1.5 text-muted-foreground focus-visible:visible group-hover:visible group-focus-within:visible"
const row = "focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label hover:bg-muted"

export interface HistoryPanelProps {
  activeIndex?: number
  /** Opens the share dialog for a run. */
  shareHref: string
  /** Signed in, history syncs to the account. Signed out, it stays in this browser. */
  signedIn?: boolean
}

/**
 * History and presets. The sidebar on desktop, a sheet on smaller screens.
 * Signed out it lives in IndexedDB; signed in it syncs to the account.
 */
export function HistoryPanel({ activeIndex = 0, shareHref, signedIn = false }: HistoryPanelProps) {
  return (
    <div className="flex min-h-full flex-col gap-6">
      <div className="space-y-2">
        <Link href="/workspace?state=ready" className="focus-ring flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card text-label font-medium shadow-sm hover:bg-muted">
          <Plus className="size-4" /> New question
        </Link>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search history" placeholder="Search history" className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-label placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20" />
        </div>
      </div>

      <section aria-labelledby="presets-h">
        <h2 id="presets-h" className="px-2.5 pb-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">Presets</h2>
        <ul>
          {presets.map((p) => (
            <li key={p.name}>
              <button type="button" className={row}>
                <Layers className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-caption tabular-nums text-muted-foreground">{p.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {history.map((group, g) => (
        <section key={group.group} aria-labelledby={`h-${g}`}>
          <h2 id={`h-${g}`} className="px-2.5 pb-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">{group.group}</h2>
          <ul>
            {group.items.map((item, i) => {
              const active = g === 0 && i === activeIndex
              return (
                <li key={item.prompt} className="group relative">
                  <button type="button" className={cn(row, "pr-16", active && "bg-accent text-accent-foreground hover:bg-accent")} aria-current={active || undefined}>
                    <LevelDot level={item.level} />
                    <span className="sr-only">{levelLabel[item.level]}:</span>
                    <span className="flex-1 truncate">{item.prompt}</span>
                    <span className="text-caption text-muted-foreground group-hover:invisible">{item.when}</span>
                  </button>
                  <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2">
                    <Link href={shareHref} aria-label={`Share "${item.prompt}"`} className={cn(rowAction, "hover:text-foreground")}>
                      <Share2 className="size-3.5" />
                    </Link>
                    <button type="button" aria-label={`Delete "${item.prompt}"`} className={cn(rowAction, "hover:text-destructive")}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <p className="mt-auto flex items-center gap-2 border-t border-border px-2.5 pt-3 text-caption text-muted-foreground">
        {signedIn ? (
          <>
            <Cloud className="size-3.5 shrink-0" /> Synced to your account
          </>
        ) : (
          <>
            <HardDrive className="size-3.5 shrink-0" />
            <span>
              Only in this browser.{" "}
              <Link href="/account?state=signedOut" className="focus-ring rounded font-medium text-primary hover:underline">Sign in to sync.</Link>
            </span>
          </>
        )}
      </p>
    </div>
  )
}
