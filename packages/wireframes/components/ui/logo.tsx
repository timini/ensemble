import Link from "next/link"

/** Ensemble wordmark: three overlapping circles and the name in the display face. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="focus-ring flex items-center gap-2 rounded-md" aria-label="Ensemble home">
      <svg viewBox="0 0 28 20" className="h-5 w-7 text-primary" aria-hidden>
        <circle cx="8" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="14" cy="10" r="7" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="20" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      <span className="font-display text-[1.375rem] leading-none tracking-tight">Ensemble</span>
    </Link>
  )
}
