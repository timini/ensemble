import { cn } from "@/lib/utils"

/** Neutral round mark standing in for a provider logo. */
export function ModelMark({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.625rem] font-semibold text-background",
        className,
      )}
    >
      {initials}
    </span>
  )
}
