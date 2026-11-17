import Link from "next/link"

/** Quiet footer shared by the public pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-gutter py-8 text-caption text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Keys stay in your browser in Free mode. Prompts go straight to the providers you pick.</p>
        <nav className="flex gap-4">
          <Link className="focus-ring rounded hover:text-foreground" href="/benchmarks">Benchmarks</Link>
          <Link className="focus-ring rounded hover:text-foreground" href="/account">Account</Link>
          <Link className="focus-ring rounded hover:text-foreground" href="/states">Wireframe index</Link>
        </nav>
      </div>
    </footer>
  )
}
