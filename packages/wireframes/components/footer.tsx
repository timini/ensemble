import Link from "next/link"

const year = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t border-border bg-background" data-testid="site-footer">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/config" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Get Started
          </Link>
          <Link href="/features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
          <a
            href="https://github.com/timini/ensemble"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
        <p className="text-sm text-muted-foreground">© {year} Ensemble AI</p>
      </div>
    </footer>
  )
}
