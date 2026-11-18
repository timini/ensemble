import Link from "next/link"
import { History, Settings } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { href, type WorkspaceParams } from "@/lib/params"

const iconLink = "focus-ring inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"

/** Workspace header. History opens as a sheet below 1024 px, where the sidebar is hidden. */
export function AppHeader({ params }: { params: WorkspaceParams }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-gutter lg:px-4">
        <Link href={href(params, { sheet: "history" })} aria-label="History and presets" className={`${iconLink} -ml-2 lg:hidden`}>
          <History className="size-5" />
        </Link>
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <Link href="/benchmarks" className="focus-ring hidden rounded-lg px-3 py-2 text-label text-muted-foreground hover:text-foreground md:block">
            Benchmarks
          </Link>
          <Link href={href(params, { sheet: "settings" })} aria-label="Settings" className={iconLink}>
            <Settings className="size-5" />
          </Link>
          {params.signedIn === "1" ? (
            <Link href="/account" aria-label="Account" className="focus-ring inline-flex size-8 items-center justify-center rounded-full bg-primary text-caption font-semibold text-primary-foreground">
              AL
            </Link>
          ) : (
            <Link href="/account" className="focus-ring hidden rounded-lg border border-border px-3 py-1.5 text-label font-medium hover:bg-muted sm:block">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
