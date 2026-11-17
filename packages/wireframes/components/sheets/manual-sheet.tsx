import { Button } from "@/components/ui/button"
import { Field, inputClass } from "@/components/ui/field"
import { Sheet } from "@/components/ui/sheet"
import { href, type WorkspaceParams } from "@/lib/params"

/** Paste an answer from another tool so it joins the comparison. */
export function ManualSheet({ params }: { params: WorkspaceParams }) {
  const close = href(params, { sheet: undefined })
  return (
    <Sheet
      title="Add an answer by hand"
      description="Paste an answer from another tool. It is compared and merged like the others."
      closeHref={close}
      footer={
        <div className="flex justify-end gap-2">
          <Button href={close} variant="ghost">Cancel</Button>
          <Button href={close}>Add answer</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Source" hint="Shown as the column title.">
          <input className={inputClass} placeholder="For example: my GP, a textbook, Perplexity" />
        </Field>
        <Field label="Answer">
          <textarea rows={8} className={`${inputClass} h-auto py-2`} placeholder="Paste the answer here" />
        </Field>
      </div>
    </Sheet>
  )
}
