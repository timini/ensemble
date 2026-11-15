import { Archive, MessageSquare, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ChatSessionListItemView } from "@/lib/pro-types"

interface HistoryListItemProps {
  session: ChatSessionListItemView
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function HistoryListItem({ session, isSelected, onSelect, onDelete }: HistoryListItemProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <button type="button" onClick={() => onSelect(session.id)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{session.title}</p>
          <Badge variant="outline" className="shrink-0">
            {session.updatedAt}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{session.preview}</p>
      </button>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {session.messageCount} messages
        </span>
        <span>{session.totalCredits} credits</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Archive className="h-3.5 w-3.5" />
          {session.status}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onDelete(session.id)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  )
}
