import { Vote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { MajorityResult } from "./chat-types"
import { ModelResponseCard } from "./model-response-card"
import { ModelResponseGrid } from "./model-response-grid"
import { FunnelConnector } from "./turn-connector"
import { AgreementAnalysis } from "./agreement-analysis"

interface MajorityTurnProps {
  result: MajorityResult
}

export function MajorityTurn({ result }: MajorityTurnProps) {
  const tallySorted = Object.entries(result.voteTally).sort(([, a], [, b]) => b - a)
  const totalVotes = Object.values(result.voteTally).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-0">
      {/* Model responses with vote badges */}
      <ModelResponseGrid columns={result.responses.length}>
        {result.responses.map((r) => {
          const vote = result.votes[r.modelId]
          return (
            <ModelResponseCard
              key={r.modelId}
              response={r}
              badge={
                vote ? (
                  <Badge variant={vote === result.majorityPosition ? "default" : "secondary"} className="text-xs">
                    {vote}
                  </Badge>
                ) : undefined
              }
            />
          )
        })}
      </ModelResponseGrid>

      {/* Funnel connector with converging splines */}
      <FunnelConnector
        columns={result.responses.length}
        label={`${result.responses.length} models voting \u00b7 majority wins`}
      />

      {/* Vote tally card — visually strong like the ensemble answer card */}
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 shadow-md shadow-primary/10">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
              <Vote className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-base font-semibold text-primary">Majority Result</h4>
          </div>
          <div className="space-y-2.5">
            {tallySorted.map(([position, count]) => {
              const pct = Math.round((count / totalVotes) * 100)
              const isWinner = position === result.majorityPosition
              return (
                <div key={position} className="flex items-center gap-3">
                  <span className={`w-24 text-sm font-medium ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
                    {position}
                  </span>
                  <div className="h-3 flex-1 rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full transition-all ${isWinner ? "bg-primary" : "bg-muted-foreground/30"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`w-20 text-right text-sm ${isWinner ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {count} vote{count !== 1 ? "s" : ""} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-4 border-t border-primary/20 pt-3 text-sm text-foreground">
            Majority position: <strong className="text-primary">{result.majorityPosition}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Agreement */}
      <div className="mt-3">
        <AgreementAnalysis agreement={result.agreement} responseCount={result.responses.length} />
      </div>
    </div>
  )
}
