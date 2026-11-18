import { ManualSheet } from "@/components/sheets/manual-sheet"
import { OnboardingSheet } from "@/components/sheets/onboarding-sheet"
import { SettingsSheet } from "@/components/sheets/settings-sheet"
import { ShareSheet } from "@/components/sheets/share-sheet"
import { Sheet } from "@/components/ui/sheet"
import { AgreementPanel } from "@/components/workspace/agreement-panel"
import { Answers } from "@/components/workspace/answers"
import { AppHeader } from "@/components/workspace/app-header"
import { Composer } from "@/components/workspace/composer"
import { ConsensusCard } from "@/components/workspace/consensus-card"
import { EmptyIntro, ExampleQuestions } from "@/components/workspace/empty-state"
import { HistoryPanel } from "@/components/workspace/history-panel"
import { href, readParams } from "@/lib/params"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/**
 * The one workspace screen. URL params pick the wireframe state:
 * state=new|ready|running|done, sheet=onboarding|settings|manual|history|share,
 * menu=method|options, path=keys|local, share=create|ready|error|limit, signedIn=1.
 */
export default async function WorkspacePage({ searchParams }: Props) {
  const params = readParams(await searchParams)
  const empty = params.state === "new" || params.state === "ready"
  const running = params.state === "running"
  const signedIn = params.signedIn === "1"
  const shareHref = href(params, { sheet: "share", share: undefined })

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader params={params} />
      <div className="flex flex-1">
        <aside aria-label="History and presets" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r border-border bg-card/40 p-3 lg:block">
          <HistoryPanel activeIndex={empty ? -1 : 0} shareHref={shareHref} signedIn={signedIn} />
        </aside>
        <main className="min-w-0 flex-1">
          <div className={`mx-auto space-y-6 px-gutter py-6 ${empty ? "max-w-2xl" : "max-w-6xl"}`}>
            {empty && <EmptyIntro />}
            <Composer params={params} />
            {empty ? (
              <ExampleQuestions />
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_2fr]">
                  <AgreementPanel pending={running} />
                  <ConsensusCard pending={running} shareHref={shareHref} />
                </div>
                <Answers running={running} />
              </>
            )}
          </div>
        </main>
      </div>

      {params.sheet === "onboarding" && <OnboardingSheet params={params} />}
      {params.sheet === "settings" && <SettingsSheet params={params} />}
      {params.sheet === "manual" && <ManualSheet params={params} />}
      {params.sheet === "share" && <ShareSheet params={params} />}
      {params.sheet === "history" && (
        <Sheet title="History" side="left" closeHref={href(params, { sheet: undefined })}>
          <HistoryPanel activeIndex={empty ? -1 : 0} shareHref={shareHref} signedIn={signedIn} />
        </Sheet>
      )}
    </div>
  )
}
