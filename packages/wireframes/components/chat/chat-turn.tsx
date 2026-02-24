import type { ChatTurn as ChatTurnType } from "./chat-types"
import { UserMessage } from "./user-message"
import { VerticalConnector } from "./turn-connector"
import { StandardTurn } from "./standard-turn"
import { CouncilTurn } from "./council-turn"
import { MajorityTurn } from "./majority-turn"
import { EloTurn } from "./elo-turn"
import { Badge } from "@/components/ui/badge"
import { ensembleModes } from "./chat-types"

interface ChatTurnProps {
  turn: ChatTurnType
}

export function ChatTurn({ turn }: ChatTurnProps) {
  const modeName = ensembleModes.find((m) => m.id === turn.config.mode)?.name ?? turn.config.mode

  return (
    <div className="space-y-0">
      {/* User message */}
      <UserMessage message={turn.userMessage} />

      {/* Mode badge */}
      <div className="flex items-center justify-center py-2">
        <Badge variant="secondary" className="text-xs">
          {modeName} &middot; {turn.config.selectedModels.length} models
        </Badge>
      </div>

      <VerticalConnector />

      {/* Mode-specific result renderer */}
      {turn.result.type === "standard" && <StandardTurn result={turn.result} />}
      {turn.result.type === "council" && <CouncilTurn result={turn.result} />}
      {turn.result.type === "majority" && <MajorityTurn result={turn.result} />}
      {turn.result.type === "elo" && <EloTurn result={turn.result} />}
    </div>
  )
}
