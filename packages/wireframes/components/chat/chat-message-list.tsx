"use client"

import { useEffect, useRef } from "react"
import type { ChatTurn as ChatTurnType } from "./chat-types"
import { ChatTurn } from "./chat-turn"

interface ChatMessageListProps {
  turns: ChatTurnType[]
}

export function ChatMessageList({ turns }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-10">
        {turns.map((turn) => (
          <ChatTurn key={turn.id} turn={turn} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
