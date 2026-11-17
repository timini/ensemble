import { AgreementRing } from "@/components/ui/agreement-ring"
import { ModelMark } from "@/components/ui/model-mark"
import { agreement, answers, consensus, levelLabel, prompt } from "@/lib/sample-run"

/** Recorded run shown on the landing page. Real answers, no keys needed. */
export function ExampleRun() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <span className="text-caption font-medium uppercase tracking-wider text-muted-foreground">Recorded run</span>
        <span className="text-caption text-muted-foreground">3 models · 7 calls · $0.011</span>
      </div>
      <div className="space-y-5 p-5">
        <p className="text-label font-medium">{prompt}</p>
        <div className="flex items-center gap-4 rounded-xl bg-muted/70 p-4">
          <AgreementRing score={agreement.score} level={agreement.level} size={64} />
          <div>
            <p className="text-label font-semibold text-success">{levelLabel[agreement.level]}</p>
            <p className="text-caption text-muted-foreground">The three answers say the same thing in different words.</p>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-caption font-medium uppercase tracking-wider text-muted-foreground">Consensus</p>
          <p className="text-label leading-relaxed">{consensus[0]}</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {answers.map((a) => (
            <li key={a.model.id} className="rounded-lg border border-border p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <ModelMark initials={a.model.initials} className="size-5" />
                <span className="truncate text-caption font-medium">{a.model.name}</span>
              </div>
              <p className="line-clamp-2 text-caption text-muted-foreground">{a.text[0]}</p>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
