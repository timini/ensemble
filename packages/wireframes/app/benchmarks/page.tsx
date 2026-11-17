import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const datasets = ["GSM8K", "MMLU-Pro", "GPQA", "TruthfulQA"]
const columns = ["Best single model", "Majority vote", "Consensus", "Difference (95% CI)"]

/** /benchmarks: method first, then results with confidence intervals, honest when not run. */
export default function BenchmarksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-10 px-gutter py-section">
        <header className="space-y-3">
          <h1 className="font-display text-title font-normal">Does an ensemble beat its best member?</h1>
          <p className="text-lead text-muted-foreground">
            We test three open models alone and together on four datasets, at least 200 questions each, with paired tests and confidence intervals. Anyone can rerun it with one command.
          </p>
        </header>

        <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-4 text-label">
          <p className="font-semibold">Results are not in yet.</p>
          <p className="text-muted-foreground">Until they are, we make no claim that ensembles are more accurate than the best single model.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-label">
            <thead className="border-b border-border text-caption uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Dataset</th>
                {columns.map((c) => <th key={c} scope="col" className="px-4 py-3 text-right font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {datasets.map((d) => (
                <tr key={d}>
                  <th scope="row" className="px-4 py-3 font-medium">{d}</th>
                  {columns.map((c) => <td key={c} className="px-4 py-3 text-right font-mono text-muted-foreground">Not run</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            ["Models", "Qwen, Llama and Gemma, 7B to 14B, through OpenRouter or Ollama. One premium model as a reference."],
            ["Answers", "Options shuffled with a fixed seed. Final answers read mechanically. Timeouts count as wrong."],
            ["Statistics", "n of at least 200 per dataset, McNemar tests for pairs, Wilson intervals for every rate."],
          ].map(([t, b]) => (
            <div key={t} className="border-t border-border pt-4">
              <h2 className="text-heading">{t}</h2>
              <p className="mt-1 text-label text-muted-foreground">{b}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
