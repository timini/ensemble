import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { MajorityResult } from "./chat-types"
import { ModelResponseCard } from "./model-response-card"
import { ModelResponseGrid } from "./model-response-grid"
import { VerticalConnector } from "./turn-connector"
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

      <VerticalConnector />

      {/* Vote tally card */}
      <Card className="border-primary/20">
        <CardContent className="p-5">
          <h4 className="mb-3 text-sm font-semibold">Majority Result</h4>
          <div className="space-y-2">
            {tallySorted.map(([position, count]) => {
              const pct = Math.round((count / totalVotes) * 100)
              const isWinner = position === result.majorityPosition
              return (
                <div key={position} className="flex items-center gap-3">
                  <span className={`w-20 text-sm font-medium ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
                    {position}
                  </span>
                  <div className="h-3 flex-1 rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full transition-all ${isWinner ? "bg-primary" : "bg-muted-foreground/30"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`w-16 text-right text-sm ${isWinner ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {count} vote{count !== 1 ? "s" : ""} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Majority position: <strong className="text-foreground">{result.majorityPosition}</strong>
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
