interface ModelResponseGridProps {
  children: React.ReactNode
  /** Number of columns to display (defaults to auto-fit) */
  columns?: number
}

/** Responsive wrapper: horizontal scroll-snap on mobile, equal-width grid on desktop */
export function ModelResponseGrid({ children, columns }: ModelResponseGridProps) {
  return (
    <div
      className={`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:grid md:overflow-x-visible md:pb-0 ${
        !columns ? "md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]" : ""
      }`}
      style={
        columns
          ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {children}
    </div>
  )
}
