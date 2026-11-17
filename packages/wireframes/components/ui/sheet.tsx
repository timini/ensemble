import Link from "next/link"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SheetProps {
  title: string
  description?: string
  closeHref: string
  side?: "right" | "left"
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Wireframe sheet. A side panel from 768 px up, a bottom sheet below.
 * Open and closed states are driven by the URL so each state can be linked.
 */
export function Sheet({ title, description, closeHref, side = "right", children, footer }: SheetProps) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-labelledby="sheet-title">
      <Link href={closeHref} aria-label="Close" className="absolute inset-0 animate-fade-in bg-foreground/30 backdrop-blur-[2px] dark:bg-black/60" />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-rise-in flex-col rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-lg",
          "md:inset-y-0 md:bottom-auto md:h-full md:max-h-none md:w-[440px] md:rounded-none md:border-y-0",
          side === "right" ? "md:left-auto md:right-0 md:border-r-0" : "md:left-0 md:right-auto md:border-l-0",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border md:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-4 md:pt-6">
          <div>
            <h2 id="sheet-title" className="text-heading">{title}</h2>
            {description && <p className="mt-1 text-label text-muted-foreground">{description}</p>}
          </div>
          <Link href={closeHref} aria-label="Close" className="focus-ring -mr-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <footer className="border-t border-border px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}
