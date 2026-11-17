import Link from "next/link"
import { SiteHeader } from "@/components/site-header"

const groups: Array<[string, Array<[string, string]>]> = [
  ["Public pages", [["Landing", "/"], ["Benchmarks", "/benchmarks"], ["Account (M5 placeholder)", "/account"]]],
  ["Workspace", [
    ["First visit: onboarding, keys", "/workspace?state=new"],
    ["First visit: onboarding, local", "/workspace?state=new&path=local"],
    ["Ready, nothing asked yet", "/workspace?state=ready"],
    ["Running, answers streaming", "/workspace?state=running"],
    ["Done", "/workspace"],
    ["Model picker open", "/workspace?state=ready&menu=models"],
    ["Method dropdown open", "/workspace?menu=method"],
    ["Composer options open", "/workspace?menu=options"],
    ["Manual answer sheet", "/workspace?sheet=manual"],
    ["Settings sheet", "/workspace?sheet=settings"],
    ["History sheet (below 1024 px)", "/workspace?sheet=history"],
  ]],
  ["Old routes (redirect)", [["/config", "/config"], ["/ensemble", "/ensemble"], ["/prompt", "/prompt"], ["/review", "/review"]]],
]

/** Index of every wireframe state, for reviewers. */
export default function StatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-gutter py-10">
        <h1 className="font-display text-title font-normal">Wireframe states</h1>
        <p className="text-label text-muted-foreground">Add <code className="font-mono">?theme=dark</code> or <code className="font-mono">&amp;theme=dark</code> to any link to force a theme.</p>
        {groups.map(([title, links]) => (
          <section key={title}>
            <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {links.map(([label, url]) => (
                <li key={url}>
                  <Link href={url} className="focus-ring flex justify-between gap-4 px-4 py-3 text-label hover:bg-muted">
                    <span>{label}</span>
                    <span className="truncate font-mono text-caption text-muted-foreground">{url}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  )
}
