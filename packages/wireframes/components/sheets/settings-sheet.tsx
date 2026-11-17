import { Plus } from "lucide-react"
import { Sheet } from "@/components/ui/sheet"
import { inputClass } from "@/components/ui/field"
import { href, type WorkspaceParams } from "@/lib/params"

const keys = [
  { name: "OpenRouter", status: "Works", value: "sk-or-v1-••••3f9a" },
  { name: "OpenAI", status: "Works", value: "sk-proj-••••a01c" },
  { name: "Anthropic", status: "Not set", value: "" },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border py-5 first:border-t-0 first:pt-0">
      <h3 className="text-label font-semibold">{title}</h3>
      {children}
    </section>
  )
}

const segmented = "flex rounded-lg bg-muted p-1 text-label"
const seg = (on: boolean) => `focus-ring flex-1 rounded-md py-1.5 ${on ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`

/** Settings: keys, local endpoints, embeddings, theme and language. Replaces /config. */
export function SettingsSheet({ params }: { params: WorkspaceParams }) {
  const theme = params.theme ?? "system"
  return (
    <Sheet title="Settings" closeHref={href(params, { sheet: undefined })}>
      <Section title="API keys">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {keys.map((k) => (
            <li key={k.name} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-24 shrink-0 text-label">{k.name}</span>
              <span className="flex-1 truncate font-mono text-caption text-muted-foreground">{k.value || "Add a key"}</span>
              <span className={`text-caption ${k.value ? "text-success" : "text-muted-foreground"}`}>{k.status}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="focus-ring inline-flex items-center gap-1.5 rounded-md text-label font-medium text-primary"><Plus className="size-4" /> Add a key</button>
      </Section>
      <Section title="Local endpoints">
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          <span className="flex-1 text-label">Ollama</span>
          <span className="font-mono text-caption text-muted-foreground">localhost:11434/v1</span>
        </div>
        <button type="button" className="focus-ring inline-flex items-center gap-1.5 rounded-md text-label font-medium text-primary"><Plus className="size-4" /> Add an endpoint</button>
      </Section>
      <Section title="Agreement embeddings">
        <select aria-label="Embeddings provider" className={inputClass} defaultValue="openai">
          <option value="openai">OpenAI · text-embedding-3-small</option>
          <option value="google">Google · gemini-embedding-2</option>
          <option value="ollama">Ollama · nomic-embed-text</option>
        </select>
        <p className="text-caption text-muted-foreground">Used to score how much answers agree. Without one there is no score.</p>
      </Section>
      <Section title="Appearance">
        <div className={segmented} role="radiogroup" aria-label="Theme">
          {(["light", "dark", "system"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} className={seg(theme === t)}>
              {t === "system" ? "System" : t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <div className={segmented} role="radiogroup" aria-label="Language">
          <button type="button" role="radio" aria-checked className={seg(true)}>English</button>
          <button type="button" role="radio" aria-checked={false} className={seg(false)}>Français</button>
        </div>
      </Section>
      <Section title="Data">
        <button type="button" className="focus-ring rounded-md text-label font-medium text-destructive">Clear keys, history and presets</button>
      </Section>
    </Sheet>
  )
}
