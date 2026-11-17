import Link from "next/link"
import { BookmarkPlus, ClipboardPaste, MoreHorizontal, Wand2 } from "lucide-react"
import { href, type WorkspaceParams } from "@/lib/params"

const item = "focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label hover:bg-muted"

/** Composer overflow: manual answer, summarizer and saving a preset. */
export function OptionsMenu({ params }: { params: WorkspaceParams }) {
  return (
    <details className="relative" open={params.menu === "options"}>
      <summary aria-label="More options" className="focus-ring inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="size-5" />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-64 animate-rise-in rounded-xl border border-border bg-popover p-1.5 shadow-lg">
        <Link href={href(params, { sheet: "manual" })} className={item}>
          <ClipboardPaste className="size-4 text-muted-foreground" /> Add an answer by hand
        </Link>
        <button type="button" className={item}>
          <Wand2 className="size-4 text-muted-foreground" />
          <span className="flex-1">Summarizer</span>
          <span className="text-caption text-muted-foreground">Claude Opus 5.5</span>
        </button>
        <button type="button" className={item}>
          <BookmarkPlus className="size-4 text-muted-foreground" /> Save models as a preset
        </button>
      </div>
    </details>
  )
}
