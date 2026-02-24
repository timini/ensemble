import { Copy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { type ModelResponse, providerBadgeColors, providerBorderLeft, providerLabels } from "./chat-types"

interface ModelResponseCardProps {
  response: ModelResponse
  /** Optional badge to overlay (e.g. vote position) */
  badge?: React.ReactNode
}

export function ModelResponseCard({ response, badge }: ModelResponseCardProps) {
  return (
    <Card className={`flex min-w-[85vw] snap-center flex-col border-l-4 ${providerBorderLeft[response.provider]} md:min-w-0`}>
      <CardContent className="flex flex-1 flex-col p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{response.modelName}</p>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${providerBadgeColors[response.provider]}`}>
              {providerLabels[response.provider]}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge}
            <span className="text-xs text-muted-foreground">{response.responseTime}</span>
          </div>
        </div>

        {/* Content */}
        <p className="flex-1 text-sm leading-relaxed text-foreground">{response.content}</p>

        {/* Footer */}
        <div className="mt-3 border-t pt-2">
          <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />Copy
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
