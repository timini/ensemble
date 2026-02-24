"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CouncilResult } from "./chat-types"
import { ModelResponseCard } from "./model-response-card"
import { ModelResponseGrid } from "./model-response-grid"
import { VerticalConnector, FunnelConnector, RoundSeparator } from "./turn-connector"
import { EnsembleAnswerCard } from "./ensemble-answer-card"
import { AgreementAnalysis } from "./agreement-analysis"

interface CouncilTurnProps {
  result: CouncilResult
}

export function CouncilTurn({ result }: CouncilTurnProps) {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  const toggleRound = (n: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const firstRound = result.rounds[0]
  const laterRounds = result.rounds.slice(1)
  const totalResponses = result.rounds.reduce((sum, r) => sum + r.responses.length, 0)
  const lastRound = result.rounds[result.rounds.length - 1]
  const lastRoundModelCount = lastRound ? lastRound.responses.length : firstRound ? firstRound.responses.length : 3

  return (
    <div className="space-y-0">
      {/* Round 1 — always visible */}
      {firstRound && (
        <>
          <RoundSeparator label={`Round 1: ${firstRound.label}`} />
          <ModelResponseGrid columns={firstRound.responses.length}>
            {firstRound.responses.map((r) => (
              <ModelResponseCard key={r.modelId} response={r} />
            ))}
          </ModelResponseGrid>
        </>
      )}

      {/* Later rounds — collapsed by default */}
      {laterRounds.map((round) => {
        const isExpanded = expandedRounds.has(round.roundNumber)
        return (
          <div key={round.roundNumber}>
            <VerticalConnector />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
              onClick={() => toggleRound(round.roundNumber)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">Round {round.roundNumber}: {round.label}</span>
              <span className="text-xs text-muted-foreground">({round.responses.length} responses)</span>
            </button>
            {isExpanded && (
              <div className="mt-2">
                <ModelResponseGrid columns={round.responses.length}>
                  {round.responses.map((r) => (
                    <ModelResponseCard key={`${round.roundNumber}-${r.modelId}`} response={r} />
                  ))}
                </ModelResponseGrid>
              </div>
            )}
          </div>
        )
      })}

      {/* Funnel connector with converging splines */}
      <FunnelConnector
        columns={lastRoundModelCount}
        label={`Synthesising ${result.rounds.length} rounds via ${result.synthesizedBy}`}
      />

      {/* Final synthesis */}
      <EnsembleAnswerCard synthesis={result.finalSynthesis} synthesizedBy={result.synthesizedBy} />

      {/* Agreement */}
      <div className="mt-3">
        <AgreementAnalysis agreement={result.agreement} responseCount={totalResponses} />
      </div>
    </div>
  )
}
