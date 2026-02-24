import { Card, CardContent } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import type { EloResult } from "./chat-types"
import { ModelResponseCard } from "./model-response-card"
import { ModelResponseGrid } from "./model-response-grid"
import { FunnelConnector, VerticalConnector } from "./turn-connector"
import { EnsembleAnswerCard } from "./ensemble-answer-card"
import { AgreementAnalysis } from "./agreement-analysis"

const rankStyles: Record<number, { icon: string; color: string }> = {
  1: { icon: "\u{1F947}", color: "text-yellow-600 dark:text-yellow-400" },
  2: { icon: "\u{1F948}", color: "text-gray-500 dark:text-gray-400" },
  3: { icon: "\u{1F949}", color: "text-amber-700 dark:text-amber-500" },
}

interface EloTurnProps {
  result: EloResult
}

export function EloTurn({ result }: EloTurnProps) {
  return (
    <div className="space-y-0">
      {/* Model responses */}
      <ModelResponseGrid columns={result.responses.length}>
        {result.responses.map((r) => (
          <ModelResponseCard key={r.modelId} response={r} />
        ))}
      </ModelResponseGrid>

      {/* Converging splines from responses → rankings */}
      <FunnelConnector
        columns={result.responses.length}
        label={`Ranking ${result.responses.length} models pairwise`}
      />

      {/* Rankings card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">ELO Rankings</h4>
          </div>
          <div className="space-y-2">
            {result.rankings.map((entry) => {
              const style = rankStyles[entry.rank] ?? { icon: `#${entry.rank}`, color: "text-muted-foreground" }
              return (
                <div key={entry.modelId} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="w-6 text-center text-lg">{style.icon}</span>
                  <span className={`flex-1 text-sm font-medium ${style.color}`}>{entry.modelName}</span>
                  <span className="font-mono text-sm text-muted-foreground">{entry.eloScore}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <VerticalConnector />

      {/* Top-N synthesis */}
      <EnsembleAnswerCard synthesis={result.topNSynthesis} synthesizedBy={result.synthesizedBy} />

      {/* Agreement */}
      <div className="mt-3">
        <AgreementAnalysis agreement={result.agreement} responseCount={result.responses.length} />
      </div>
    </div>
  )
}
