import { AlertCircle, Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { inputClass } from "@/components/ui/field"
import { Sheet } from "@/components/ui/sheet"
import { href, type WorkspaceParams } from "@/lib/params"
import { prompt, sharedRun } from "@/lib/sample-run"
import { cn } from "@/lib/utils"

const included = ["The prompt and the models you picked", "Every answer", "The agreement score and the consensus answer"]

/**
 * Share a run as a read-only link. `share=create|ready|error|limit` picks the state:
 * explain and create, the link made, could not create it, or too many links.
 */
export function ShareSheet({ params }: { params: WorkspaceParams }) {
  const close = href(params, { sheet: undefined, share: undefined })
  const state = params.share ?? "ready"

  if (state === "create") {
    return (
      <Sheet
        title="Share this run"
        description="Make a read-only link to this run."
        closeHref={close}
        footer={
          <div className="flex justify-end gap-2">
            <Button href={close} variant="ghost">Cancel</Button>
            <Button href={href(params, { share: "ready" })}><Link2 /> Create link</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <RunTitle />
          <section className="space-y-2">
            <h3 className="text-label font-semibold">The link shows</h3>
            <ul className="space-y-1.5">
              {included.map((item) => (
                <li key={item} className="flex gap-2 text-label">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <ul className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-4 text-caption text-muted-foreground">
            <li>Anyone with the link can see it. They do not need an account.</li>
            <li>The link expires after 30 days.</li>
            <li>Your API keys are never included.</li>
          </ul>
        </div>
      </Sheet>
    )
  }

  if (state === "error" || state === "limit") {
    return (
      <Sheet
        title="Share this run"
        closeHref={close}
        footer={
          <div className="flex justify-end gap-2">
            <Button href={close} variant="ghost">Close</Button>
            <Button href={href(params, { share: "ready" })}>Try again</Button>
          </div>
        }
      >
        <div role="alert" className="flex gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="text-label font-semibold">Could not create the link</p>
            <p className="text-label text-muted-foreground">
              {state === "limit" ? "You have made too many links in a short time. Try again later." : "Something went wrong on our side. Try again."}
            </p>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      title="Share this run"
      description="Anyone with this link can see the run."
      closeHref={close}
      footer={
        <div className="flex justify-between gap-2">
          <Button href={href(params, { share: "create" })} variant="outline" className="text-destructive hover:bg-destructive/10">Delete link</Button>
          <Button href={close}>Done</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <RunTitle />
        <div className="space-y-1.5">
          <label htmlFor="share-url" className="text-label font-medium">Link</label>
          <div className="flex gap-2">
            <input id="share-url" readOnly value={sharedRun.url} className={cn(inputClass, "min-w-0 font-mono")} />
            <CopyButton text={sharedRun.url} />
          </div>
          <p className="text-caption text-muted-foreground">Expires on {sharedRun.expires}.</p>
        </div>
        <p className="text-caption text-muted-foreground">Deleting the link stops it working for everyone who has it. Your run stays in your history.</p>
      </div>
    </Sheet>
  )
}

function RunTitle() {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-caption text-muted-foreground">Run</p>
      <p className="line-clamp-2 text-label font-medium">{prompt}</p>
    </div>
  )
}
