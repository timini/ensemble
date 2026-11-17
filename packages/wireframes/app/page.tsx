import { ExampleRun } from "@/components/landing/example-run"
import { HowItWorks } from "@/components/landing/how-it-works"
import { ScoreGuide } from "@/components/landing/score-guide"
import { WaysIn } from "@/components/landing/ways-in"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

/** Landing page at `/`: one sentence, a recorded run, three ways in. */
export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-gutter pb-section pt-10 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div className="space-y-6">
            <p className="text-caption font-medium uppercase tracking-wider text-primary">For questions where being wrong costs something</p>
            <h1 className="text-balance font-display text-display">Ask several AI models at once. See where they agree.</h1>
            <p className="max-w-xl text-lead text-muted-foreground">
              Ensemble sends your question to the models you choose, scores how closely their answers agree, and merges them into one answer you can check against the originals.
            </p>
            <WaysIn />
          </div>
          <ExampleRun />
        </section>
        <ScoreGuide />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  )
}
