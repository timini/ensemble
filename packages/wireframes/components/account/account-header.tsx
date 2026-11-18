import Link from "next/link"
import { Settings } from "lucide-react"
import { Logo } from "@/components/ui/logo"

const iconLink = "focus-ring inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"

/** The AppShell header on /account: no history toggle, a link back to the workspace, the account menu. */
export function AccountHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-gutter lg:px-4">
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <Link href="/workspace" className="focus-ring rounded-lg px-3 py-2 text-label text-muted-foreground hover:text-foreground">
            Workspace
          </Link>
          <Link href="/workspace?sheet=settings" aria-label="Settings" className={iconLink}>
            <Settings className="size-5" />
          </Link>
          {signedIn ? (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-caption font-semibold text-primary-foreground">AL</span>
          ) : (
            <span className="rounded-lg px-3 py-1.5 text-label font-medium">Sign in</span>
          )}
        </div>
      </div>
    </header>
  )
}
