"use client"

import { useState } from "react"
import { SquarePen } from "lucide-react"
import { LandingView } from "@/components/landing-view"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInputBar } from "@/components/chat/chat-input-bar"
import {
  type ChatTurn,
  type EnsembleConfig,
  SEED_TURNS,
} from "@/components/chat/chat-types"

// ── Wireframe toggles ──────────────────────────────────────────────
/** Set to true to load with pre-seeded chat turns */
const showSeededChat = false
/** Set to false to preview the signed-out landing state */
const isSignedIn = true
// ────────────────────────────────────────────────────────────────────

const defaultConfig: EnsembleConfig = {
  selectedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"],
  leadModel: "gpt-4o",
  mode: "standard",
}

/**
 * Generates a hardcoded Standard-mode result for new prompts submitted
 * in the wireframe. In the real app this would call the ensemble API.
 */
function makeMockTurn(prompt: string, config: EnsembleConfig): ChatTurn {
  return {
    id: `turn-${Date.now()}`,
    userMessage: prompt,
    config: { ...config },
    result: {
      type: "standard",
      responses: [
        { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "1180ms", content: "This is a placeholder response from GPT-4o. In the real application, this would contain the model's actual response to your prompt." },
        { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", provider: "anthropic", responseTime: "1340ms", content: "This is a placeholder response from Claude 3.5 Sonnet. The real application would stream the actual model response here." },
        { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", provider: "google", responseTime: "890ms", content: "This is a placeholder response from Gemini 2.0 Flash. Real responses would appear here once the ensemble API is integrated." },
      ],
      synthesis: "This is a placeholder ensemble synthesis. The lead model would combine insights from all responses into a unified answer.",
      synthesizedBy: "GPT-4o",
      agreement: { overall: 78, label: "Medium Agreement", pairs: [{ a: "GPT-4o", b: "Claude 3.5 Sonnet", pct: 82, conf: 93 }, { a: "GPT-4o", b: "Gemini 2.0 Flash", pct: 76, conf: 89 }, { a: "Claude 3.5 Sonnet", b: "Gemini 2.0 Flash", pct: 74, conf: 91 }], avgConfidence: 91 },
    },
  }
}

export default function HomePage() {
  const [turns, setTurns] = useState<ChatTurn[]>(showSeededChat ? SEED_TURNS : [])
  const [config, setConfig] = useState<EnsembleConfig>(defaultConfig)

  const handleSend = (prompt: string) => {
    setTurns((prev) => [...prev, makeMockTurn(prompt, config)])
  }

  // ── Empty state → Landing view ──
  if (turns.length === 0) {
    return <LandingView isSignedIn={isSignedIn} config={config} onConfigChange={setConfig} onSend={handleSend} />
  }

  // ── Active chat view ──
  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] flex-col">
      {/* Chat toolbar */}
      <div className="border-b">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-2">
          <button
            type="button"
            onClick={() => setTurns([])}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SquarePen className="h-4 w-4" />
            New chat
          </button>
        </div>
      </div>

      <ChatMessageList turns={turns} />
      <ChatInputBar config={config} onConfigChange={setConfig} onSend={handleSend} />
    </div>
  )
}
