import type { AgreementLevel } from "@/lib/sample-run"
import { cn } from "@/lib/utils"

const tone: Record<AgreementLevel, string> = {
  high: "text-success",
  mixed: "text-warning",
  low: "text-destructive",
}

/** Circular meter for the agreement score (0 to 1). */
export function AgreementRing({ score, level, size = 96 }: { score: number; level: AgreementLevel; size?: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={`${c * score} ${c}`}
          className={cn(tone[level], "transition-[stroke-dasharray] duration-slow")}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-heading font-semibold tabular-nums">
        {Math.round(score * 100)}
      </span>
    </div>
  )
}

/** Small coloured dot for history rows. */
export function LevelDot({ level }: { level: AgreementLevel }) {
  const bg: Record<AgreementLevel, string> = { high: "bg-success", mixed: "bg-warning", low: "bg-destructive" }
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", bg[level])} />
}
