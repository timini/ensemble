import { User } from "lucide-react"

interface UserMessageProps {
  message: string
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message}</p>
      </div>
    </div>
  )
}
