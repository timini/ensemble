import Link from "next/link"
import { ArrowRight, Cpu, KeyRound, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

/** The three ways into the product, in order of how most visitors start. */
export function WaysIn() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button href="/workspace?state=new&sheet=onboarding" size="lg">
          <KeyRound /> Use your own keys <ArrowRight />
        </Button>
        <Button href="/workspace?state=new&sheet=onboarding&path=local" size="lg" variant="outline">
          <Cpu /> Use local models
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">
        One key is enough to start. An OpenRouter key reaches every provider.
      </p>
      <Link href="/workspace?state=new&sheet=onboarding" className="focus-ring inline-flex items-center gap-2 rounded-md text-label text-muted-foreground hover:text-foreground">
        <Sparkles className="size-4" /> Or sign in for Pro and pay with credits
      </Link>
    </div>
  )
}
