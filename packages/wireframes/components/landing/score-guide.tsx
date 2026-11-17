import Link from "next/link"
import { LevelDot } from "@/components/ui/agreement-ring"

const rows = [
  { level: "high" as const, title: "High agreement", body: "The models say the same thing. The consensus is probably safe to use." },
  { level: "mixed" as const, title: "Mixed agreement", body: "They overlap but differ on details. Check the parts they disagree on." },
  { level: "low" as const, title: "Low agreement", body: "Stop and read the individual answers. No single answer should be trusted here." },
]

/** What the agreement score means. Follows the claims rule: no accuracy promises. */
export function ScoreGuide() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-gutter py-section md:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="font-display text-title font-normal">What the score tells you</h2>
          <p className="mt-3 text-label text-muted-foreground">
            A single model sounds equally sure when it is right and when it is guessing. Asking several and measuring how much they agree gives you a warning sign.
          </p>
          <Link href="/benchmarks" className="focus-ring mt-4 inline-block rounded text-label font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            See how we test it
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.level} className="flex gap-4 py-4 first:pt-0">
              <span className="mt-2"><LevelDot level={row.level} /></span>
              <div>
                <p className="text-label font-semibold">{row.title}</p>
                <p className="text-label text-muted-foreground">{row.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
