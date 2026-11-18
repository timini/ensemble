import { ArrowUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModelMark } from "@/components/ui/model-mark"
import { MethodMenu } from "@/components/workspace/method-menu"
import { ModelPicker } from "@/components/workspace/model-picker"
import { OptionsMenu } from "@/components/workspace/options-menu"
import type { WorkspaceParams } from "@/lib/params"
import { models, prompt } from "@/lib/sample-run"

/** Prompt, inline model chips, method dropdown and the Ask button, in one card. */
export function Composer({ params }: { params: WorkspaceParams }) {
  const empty = params.state === "new" || params.state === "ready"
  const chips = params.state === "new" ? [] : models
  return (
    <form className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-base focus-within:border-ring/60 focus-within:shadow-md">
      <label htmlFor="prompt" className="sr-only">Your question</label>
      <textarea
        id="prompt"
        rows={empty ? 3 : 2}
        defaultValue={empty ? "" : prompt}
        placeholder="Ask a question where being wrong costs something"
        className="block max-h-60 min-h-16 w-full resize-none rounded-t-2xl [field-sizing:content] bg-transparent px-4 pb-2 pt-4 text-body placeholder:text-muted-foreground focus:outline-none sm:px-5"
      />
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 sm:px-4">
        {chips.map((m) => (
          <span key={m.id} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background pl-1 pr-1.5 text-label">
            <ModelMark initials={m.initials} className="size-6" />
            {m.name}
            <button type="button" aria-label={`Remove ${m.name}`} className="focus-ring rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <ModelPicker open={params.menu === "models"} label={chips.length ? "Add model" : "Choose models"} />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 sm:px-4">
        <MethodMenu open={params.menu === "method"} />
        <div className="ml-auto flex items-center gap-1">
          <OptionsMenu params={params} />
          <Button type="submit" aria-label="Ask" className="gap-1.5 px-3 sm:px-4" disabled={params.state === "running"}>
            <span className="hidden sm:inline">{params.state === "running" ? "Running" : "Ask"}</span>
            <ArrowUp />
          </Button>
        </div>
      </div>
    </form>
  )
}
