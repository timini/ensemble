import { cn } from "@/lib/utils"

/** Label, control and optional hint, stacked. */
export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-label font-medium">{label}</span>
      {children}
      {hint && <span className="block text-caption text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const inputClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-label shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
