import { Copy } from "lucide-react"
import { ModelMark } from "@/components/ui/model-mark"
import type { SampleAnswer } from "@/lib/sample-run"

/** One model's answer: who, how long, what it cost, and the text. */
export function AnswerCard({ answer, streaming = false, id }: { answer: SampleAnswer; streaming?: boolean; id?: string }) {
  const text = streaming ? [answer.text[0]] : answer.text
  return (
    <article id={id} aria-label={answer.model.name} className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <ModelMark initials={answer.model.initials} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-medium">{answer.model.name}</p>
          <p className="text-caption text-muted-foreground">{answer.model.provider}</p>
        </div>
        {streaming ? (
          <span className="inline-flex items-center gap-1.5 text-caption text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Streaming
          </span>
        ) : (
          <span className="text-caption tabular-nums text-muted-foreground">{answer.seconds} s · {answer.cost}</span>
        )}
      </header>
      <div className="flex-1 space-y-3 px-4 py-4 text-label leading-relaxed">
        {text.map((p) => <p key={p}>{p}</p>)}
        {streaming && <span className="inline-block h-4 w-1.5 animate-pulse bg-foreground/70 align-middle" aria-hidden />}
      </div>
      {!streaming && (
        <footer className="px-2 pb-2">
          <button type="button" className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption text-muted-foreground hover:bg-muted hover:text-foreground">
            <Copy className="size-3.5" /> Copy
          </button>
        </footer>
      )}
    </article>
  )
}
