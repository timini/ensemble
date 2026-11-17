import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

/** /account: placeholder until Pro mode (roadmap M5). Sign-in, credits and usage go here. */
export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-gutter py-section">
        <header className="space-y-3">
          <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground">Coming in a later release</span>
          <h1 className="font-display text-title font-normal">Pro account</h1>
          <p className="text-lead text-muted-foreground">
            Sign in, buy credits and run any model without your own keys. Until then, Free mode with your own key or local models has every feature.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          {["Sign in with Google or an email link", "Credits balance and top up", "Usage per run"].map((t) => (
            <div key={t} className="rounded-2xl border border-dashed border-border p-5 text-label text-muted-foreground">{t}</div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
