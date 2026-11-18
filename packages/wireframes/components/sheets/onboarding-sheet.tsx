import Link from "next/link"
import { Check, Cpu, KeyRound, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet } from "@/components/ui/sheet"
import { inputClass } from "@/components/ui/field"
import { href, type WorkspaceParams } from "@/lib/params"
import { cn } from "@/lib/utils"

/** First run: one decision (keys, local or Pro), then straight to the composer. */
export function OnboardingSheet({ params }: { params: WorkspaceParams }) {
  const path = params.path ?? "keys"
  const option = (id: "keys" | "local", Icon: typeof KeyRound, title: string, body: string) => (
    <Link
      href={href(params, { path: id })}
      aria-current={path === id || undefined}
      className={cn(
        "focus-ring flex gap-3 rounded-xl border p-4 transition-colors duration-fast",
        path === id ? "border-primary bg-accent/60" : "border-border hover:bg-muted",
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", path === id ? "text-primary" : "text-muted-foreground")} />
      <span>
        <span className="block text-label font-semibold">{title}</span>
        <span className="block text-caption text-muted-foreground">{body}</span>
      </span>
    </Link>
  )

  return (
    <Sheet
      title="How do you want to run models?"
      description="Pick one. You can add more later in settings."
      closeHref={href(params, { state: "ready", sheet: undefined, path: undefined })}
      footer={
        <Button href={href(params, { state: "ready", sheet: undefined, path: undefined })} className="w-full" size="lg">
          Start asking
        </Button>
      }
    >
      <div className="space-y-2.5">
        {option("keys", KeyRound, "Use your own key", "Stored encrypted in this browser. Never sent to our server.")}
        {option("local", Cpu, "Use local models", "Ollama, LM Studio or any OpenAI-compatible server.")}
        <div className="flex gap-3 rounded-xl border border-dashed border-border p-4 text-muted-foreground">
          <Sparkles className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="block text-label font-semibold">Sign in for Pro</span>
            <span className="block text-caption">Credits instead of keys. Coming soon.</span>
          </span>
        </div>
      </div>

      {path === "keys" ? (
        <div className="mt-6 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-label font-medium">API key</span>
            <input className={cn(inputClass, "border-success/60 font-mono")} defaultValue="sk-or-v1-••••••••••••3f9a" aria-describedby="key-ok" />
          </label>
          <p id="key-ok" className="flex items-center gap-1.5 text-caption text-success">
            <Check className="size-3.5" /> OpenRouter key works. 300+ models from every provider are available.
          </p>
          <p className="text-caption text-muted-foreground">
            One key is enough. We recognise OpenAI, Anthropic, Google, xAI, DeepSeek, Perplexity and OpenRouter keys from their prefix.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3 rounded-xl bg-muted p-4">
          <p className="flex items-center gap-1.5 text-label font-medium text-success">
            <Check className="size-4" /> Ollama found at localhost:11434
          </p>
          <p className="text-caption text-muted-foreground">3 chat models and nomic-embed-text for agreement scores. Nothing leaves your machine.</p>
        </div>
      )}
    </Sheet>
  )
}
