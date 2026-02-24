"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { AgreementData } from "./chat-types"

interface AgreementAnalysisProps {
  agreement: AgreementData
  responseCount: number
}

export function AgreementAnalysis({ agreement, responseCount }: AgreementAnalysisProps) {
  const [expanded, setExpanded] = useState(false)
  const pairCount = agreement.pairs.length

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">Agreement analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-amber-600">{agreement.overall}%</span>
          <span className="text-xs text-amber-600">{agreement.label}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          {/* Pairwise bars */}
          <p className="mb-3 text-xs font-semibold text-muted-foreground">Pairwise Comparisons</p>
          <div className="space-y-2">
            {agreement.pairs.map((pair) => (
              <div key={`${pair.a}-${pair.b}`} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex min-w-0 items-center gap-1.5 text-xs">
                  <span className="truncate">{pair.a}</span>
                  <span className="shrink-0 text-muted-foreground">vs</span>
                  <span className="truncate">{pair.b}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${pair.pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium">{pair.pct}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-primary">{responseCount}</p>
              <p className="text-[10px] text-muted-foreground">RESPONSES</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">{pairCount}</p>
              <p className="text-[10px] text-muted-foreground">COMPARISONS</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">{agreement.avgConfidence}%</p>
              <p className="text-[10px] text-muted-foreground">AVG CONFIDENCE</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
