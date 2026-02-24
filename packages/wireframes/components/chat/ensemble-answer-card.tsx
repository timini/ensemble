import { Copy, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface EnsembleAnswerCardProps {
  synthesis: string
  synthesizedBy: string
}

export function EnsembleAnswerCard({ synthesis, synthesizedBy }: EnsembleAnswerCardProps) {
  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 shadow-md shadow-primary/10">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-base font-semibold text-primary">Ensemble Answer</h4>
          </div>
          <span className="rounded-full border border-primary/20 bg-background px-2 py-0.5 text-xs text-primary">
            Synthesised by {synthesizedBy}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-foreground">{synthesis}</p>

        <div className="mt-4 flex items-center border-t border-primary/20 pt-3">
          <button type="button" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Copy className="h-3 w-3" />Copy
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
