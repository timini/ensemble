import { Check, Plus, Search } from "lucide-react"
import { ModelMark } from "@/components/ui/model-mark"
import { cn } from "@/lib/utils"

const groups = [
  { provider: "OpenRouter", models: [
    { name: "GPT-6 Astra", initials: "G", on: true, price: "$1.25" },
    { name: "Claude Opus 5.5", initials: "C", on: true, price: "$5.00" },
    { name: "Gemini 4 Carbon", initials: "Ge", on: true, price: "$1.00" },
    { name: "Grok 4.7", initials: "X", on: false, price: "$3.00" },
  ] },
  { provider: "Ollama (local)", models: [
    { name: "qwen3:14b", initials: "Q", on: false, price: "Free" },
    { name: "llama3.3:8b", initials: "L", on: false, price: "Free" },
  ] },
]

/** "Add model" chip and its picker: search, grouped by where the model runs, 2 to 6 models. */
export function ModelPicker({ open, label }: { open: boolean; label: string }) {
  return (
    <details className="sm:relative" open={open}>
      <summary className="focus-ring inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-full border border-dashed border-input px-3 text-label text-muted-foreground hover:border-solid hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Plus className="size-3.5" /> {label}
      </summary>
      <div className="absolute inset-x-3 z-30 mt-2 sm:inset-x-auto sm:left-0 sm:top-full sm:w-80 animate-rise-in rounded-xl border border-border bg-popover shadow-lg">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search models" placeholder="Search models" className="h-11 w-full rounded-t-xl bg-transparent pl-9 pr-3 text-label placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {groups.map((g) => (
            <div key={g.provider} className="pb-1">
              <p className="px-2.5 pb-1 pt-2 text-caption font-medium uppercase tracking-wider text-muted-foreground">{g.provider}</p>
              {g.models.map((m) => (
                <button key={m.name} type="button" role="menuitemcheckbox" aria-checked={m.on} className={cn("focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label hover:bg-muted")}>
                  <ModelMark initials={m.initials} className="size-5" />
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="text-caption tabular-nums text-muted-foreground">{m.price}</span>
                  <Check className={cn("size-4 text-primary", !m.on && "invisible")} />
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className="border-t border-border px-4 py-2.5 text-caption text-muted-foreground">3 of 6 selected. Price is per million output tokens.</p>
      </div>
    </details>
  )
}
