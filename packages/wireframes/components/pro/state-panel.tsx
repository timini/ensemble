import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, PackageOpen, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type PanelState = "loading" | "empty" | "error" | "success"

interface StatePanelProps {
  state: PanelState
  title?: string
  description: string
  actionHref?: string
  actionLabel?: string
}

const stateConfig: Record<PanelState, { icon: LucideIcon; classes: string }> = {
  loading: {
    icon: Loader2,
    classes: "text-sky-700 border-sky-200 bg-sky-50",
  },
  empty: {
    icon: PackageOpen,
    classes: "text-muted-foreground border-border bg-muted/30",
  },
  error: {
    icon: AlertCircle,
    classes: "text-destructive border-destructive/30 bg-destructive/10",
  },
  success: {
    icon: CheckCircle2,
    classes: "text-emerald-700 border-emerald-200 bg-emerald-50",
  },
}

const defaultTitles: Record<PanelState, string> = {
  loading: "Loading",
  empty: "No data yet",
  error: "Something went wrong",
  success: "Success",
}

export function StatePanel({ state, title, description, actionHref, actionLabel }: StatePanelProps) {
  const config = stateConfig[state]
  const Icon = config.icon

  return (
    <Card className={config.classes}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 ${state === "loading" ? "animate-spin" : ""}`} />
          <div>
            <p className="font-semibold">{title ?? defaultTitles[state]}</p>
            <p className="mt-1 text-sm">{description}</p>
            {actionHref && actionLabel && (
              <Button className="mt-4" size="sm" variant="outline" asChild>
                <Link href={actionHref}>{actionLabel}</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
