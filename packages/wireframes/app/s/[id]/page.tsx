import type { Metadata } from "next"
import { LinkIcon } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { AgreementRing } from "@/components/ui/agreement-ring"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { AnswerCard } from "@/components/workspace/answer-card"
import { agreement, answers, consensus, levelLabel, models, prompt, sharedRun } from "@/lib/sample-run"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Shared runs are public to anyone with the link but should not be indexed.
export const metadata: Metadata = { title: "Shared run · Ensemble", robots: { index: false, follow: false } }

const label = "text-caption font-medium uppercase tracking-wider text-muted-foreground"

/** Header for a logged-out visitor: the logo and one way in. */
function ShareHeader() {
  return (
    <header className="border-b border-border/70 bg-background">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-gutter">
        <Logo />
        <Button href="/workspace?state=new" variant="outline">Try Ensemble</Button>
      </div>
    </header>
  )
}

/**
 * /s/[id]: a run someone shared, read-only, for a visitor who is not signed in.
 * `?state=missing` shows the expired or deleted link.
 */
export default async function SharedRunPage({ searchParams }: Props) {
  const missing = (await searchParams).state === "missing"

  return (
    <div className="flex min-h-dvh flex-col">
      <ShareHeader />
      {missing ? (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-gutter py-section text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LinkIcon className="size-5" />
          </span>
          <h1 className="font-display text-title font-normal">This link has expired or was deleted</h1>
          <p className="text-label text-muted-foreground">Shared links last 30 days. The person who shared it can delete it sooner. Ask them for a new link.</p>
          <Button href="/workspace?state=new" size="lg">Ask your own question</Button>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-gutter py-10">
          <header className="space-y-3">
            <p className={label}>Shared run</p>
            <h1 className="font-display text-title font-normal">{prompt}</h1>
            <p className="text-label text-muted-foreground">
              {models.length} models · Shared on {sharedRun.created}, link expires {sharedRun.expires}
            </p>
          </header>

          <section aria-labelledby="agreement-h" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <AgreementRing score={agreement.score} level={agreement.level} size={72} />
            <div>
              <h2 id="agreement-h" className={label}>Agreement</h2>
              <p className="text-heading text-success">{levelLabel[agreement.level]}</p>
              <p className="text-label text-muted-foreground">The answers say the same thing. The consensus is probably safe to use.</p>
            </div>
          </section>

          <section aria-labelledby="consensus-h" className="rounded-2xl border border-primary/25 bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="consensus-h" className="text-caption font-medium uppercase tracking-wider text-primary">Consensus answer</h2>
              <p className="text-caption text-muted-foreground">Standard · merged by Claude Opus 5.5</p>
            </div>
            <div className="mt-3 space-y-3 text-body">
              {consensus.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>

          <section aria-labelledby="answers-h" className="space-y-3">
            <h2 id="answers-h" className={label}>Every answer</h2>
            <div className="space-y-4">
              {answers.map((a) => <AnswerCard key={a.model.id} answer={a} />)}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-muted/40 p-6 text-center">
            <h2 className="text-heading">Ask several models at once</h2>
            <p className="text-label text-muted-foreground">See where they agree and where they do not. Use your own keys or local models.</p>
            <Button href="/workspace?state=new" size="lg">Ask your own question</Button>
          </section>
        </main>
      )}
      <SiteFooter />
    </div>
  )
}
