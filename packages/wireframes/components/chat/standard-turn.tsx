import type { StandardResult } from "./chat-types"
import { ModelResponseCard } from "./model-response-card"
import { ModelResponseGrid } from "./model-response-grid"
import { FunnelConnector } from "./turn-connector"
import { EnsembleAnswerCard } from "./ensemble-answer-card"
import { AgreementAnalysis } from "./agreement-analysis"

interface StandardTurnProps {
  result: StandardResult
}

export function StandardTurn({ result }: StandardTurnProps) {
  return (
    <div className="space-y-0">
      {/* Side-by-side model responses */}
      <ModelResponseGrid columns={result.responses.length}>
        {result.responses.map((r) => (
          <ModelResponseCard key={r.modelId} response={r} />
        ))}
      </ModelResponseGrid>

      {/* Funnel connector */}
      <FunnelConnector columns={result.responses.length} modelCount={result.responses.length} leadModel={result.synthesizedBy} />

      {/* Synthesis */}
      <EnsembleAnswerCard synthesis={result.synthesis} synthesizedBy={result.synthesizedBy} />

      {/* Agreement */}
      <div className="mt-3">
        <AgreementAnalysis agreement={result.agreement} responseCount={result.responses.length} />
      </div>
    </div>
  )
}
