import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

const nav = [
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/#how", label: "How it works" },
]

/** Header for the landing, benchmarks and account pages. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-gutter">
        <Logo />
        <nav className="flex items-center gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring hidden rounded-lg px-3 py-2 text-label text-muted-foreground hover:text-foreground sm:block">
              {item.label}
            </Link>
          ))}
          <Button href="/workspace?state=new" size="md" className="ml-2">Open workspace</Button>
        </nav>
      </div>
    </header>
  )
}
