import { Sparkles } from "lucide-react"

/** Vertical line connector between turn sections */
export function VerticalConnector() {
  return <div className="mx-auto h-6 w-px bg-border" />
}

interface FunnelConnectorProps {
  columns?: number
  /** Descriptive label shown below the icon, e.g. "Synthesising 3 models via GPT-4o" */
  label?: string
}

/** Funnel connector — smooth splines from each response column converge into a central synthesis icon */
export function FunnelConnector({ columns = 3, label = "Synthesising" }: FunnelConnectorProps) {
  const W = 1000
  const H = 240
  const centerX = W / 2

  // Each column centre as a coordinate in the viewBox
  const positions = Array.from({ length: columns }, (_, i) =>
    ((i + 0.5) / columns) * W,
  )

  return (
    <div className="flex flex-col items-center">
      {/* Smooth converging splines */}
      <svg
        className="h-20 w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        {positions.map((x, i) => {
          const cy1 = H * 0.55
          const cy2 = H * 0.45
          return (
            <path
              key={i}
              d={`M ${x},0 C ${x},${cy1} ${centerX},${cy2} ${centerX},${H}`}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>

      {/* Central icon */}
      <div className="-mt-1.5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/15 shadow-sm shadow-primary/10">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>

      {/* Descriptive label */}
      <span className="mt-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </span>

      {/* Single line down to synthesis card */}
      <div className="h-6 w-0.5 bg-border" />
    </div>
  )
}

/** Dashed horizontal separator with centered label (for council rounds) */
export function RoundSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 border-t border-dashed border-border" />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-px flex-1 border-t border-dashed border-border" />
    </div>
  )
}
