import { Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { CreditBalanceView } from "@/lib/pro-types"

interface CreditBadgeProps {
  credit: CreditBalanceView
  compact?: boolean
}

const levelClasses: Record<CreditBalanceView["level"], string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  low: "border-amber-200 bg-amber-50 text-amber-700",
  insufficient: "border-destructive/30 bg-destructive/10 text-destructive",
}

const levelLabels: Record<CreditBalanceView["level"], string> = {
  healthy: "Healthy",
  low: "Low",
  insufficient: "Insufficient",
}

export function CreditBadge({ credit, compact = false }: CreditBadgeProps) {
  return (
    <Badge className={levelClasses[credit.level]}>
      <Wallet className="h-3.5 w-3.5" />
      <span>{credit.balance} credits</span>
      {!compact && <span className="text-[10px] uppercase tracking-wide">{levelLabels[credit.level]}</span>}
    </Badge>
  )
}
