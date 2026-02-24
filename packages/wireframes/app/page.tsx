"use client"

import { useState } from "react"
import { SquarePen } from "lucide-react"
import { LandingView } from "@/components/landing-view"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInputBar } from "@/components/chat/chat-input-bar"
import {
  type ChatTurn,
  type EnsembleConfig,
  type TurnResult,
  type ModelResponse,
  type AgreementData,
  models,
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

/** Build placeholder responses from the selected models */
function makeMockResponses(config: EnsembleConfig): ModelResponse[] {
  const times = ["890ms", "1020ms", "1180ms", "1340ms", "1580ms"]
  return config.selectedModels.map((id, i) => {
    const model = models.find((m) => m.id === id)
    return {
      modelId: id,
      modelName: model?.name ?? id,
      provider: model?.provider ?? "openai",
      responseTime: times[i % times.length]!,
      content: `This is a placeholder response from ${model?.name ?? id}. In the real application, this would contain the model's actual response to your prompt.`,
    }
  })
}

function makeMockAgreement(responses: ModelResponse[]): AgreementData {
  const pairs = []
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      pairs.push({ a: responses[i]!.modelName, b: responses[j]!.modelName, pct: 70 + Math.floor(Math.random() * 20), conf: 85 + Math.floor(Math.random() * 10) })
    }
  }
  const overall = pairs.length > 0 ? Math.round(pairs.reduce((s, p) => s + p.pct, 0) / pairs.length) : 75
  return { overall, label: overall >= 80 ? "High Agreement" : overall >= 60 ? "Medium Agreement" : "Low Agreement", pairs, avgConfidence: 90 }
}

/**
 * Generates a mode-appropriate mock result for new prompts submitted in the
 * wireframe. In the real app this would call the ensemble API.
 */
function makeMockTurn(prompt: string, config: EnsembleConfig): ChatTurn {
  const responses = makeMockResponses(config)
  const leadModel = models.find((m) => m.id === config.leadModel)
  const leadName = leadModel?.name ?? "GPT-4o"
  const agreement = makeMockAgreement(responses)

  let result: TurnResult

  switch (config.mode) {
    case "council":
      result = {
        type: "council",
        rounds: [
          { roundNumber: 1, label: "Initial Responses", responses },
          {
            roundNumber: 2,
            label: "Critiques",
            responses: responses.slice(0, Math.max(2, responses.length - 1)).map((r) => ({
              ...r,
              content: `Critique from ${r.modelName}: Building on the initial responses, there are additional considerations worth highlighting. This placeholder represents a critique in the council debate.`,
            })),
          },
          {
            roundNumber: 3,
            label: "Rebuttals",
            responses: responses.slice(0, Math.max(2, responses.length - 1)).map((r) => ({
              ...r,
              content: `Rebuttal from ${r.modelName}: Agreed on key points from the critiques. This placeholder represents a rebuttal in the final round of the council debate.`,
            })),
          },
        ],
        finalSynthesis: `This is a placeholder council synthesis by ${leadName}. After ${responses.length} models debated across 3 rounds, the key consensus points would be summarised here.`,
        synthesizedBy: leadName,
        agreement,
      }
      break

    case "majority":
      result = {
        type: "majority",
        responses,
        votes: Object.fromEntries(responses.map((r, i) => [r.modelId, i < Math.ceil(responses.length * 0.67) ? "Yes" : "Depends"])),
        majorityPosition: "Yes",
        voteTally: { Yes: Math.ceil(responses.length * 0.67), Depends: responses.length - Math.ceil(responses.length * 0.67) },
        agreement,
      }
      break

    case "elo":
      result = {
        type: "elo",
        responses,
        rankings: responses.map((r, i) => ({
          modelId: r.modelId,
          modelName: r.modelName,
          eloScore: 1600 - i * 60,
          rank: i + 1,
        })),
        topNSynthesis: `This is a placeholder Top-N synthesis by ${leadName}. The top-ranked responses have been combined into a unified answer based on the ELO ranking results.`,
        synthesizedBy: leadName,
        agreement,
      }
      break

    default:
      result = {
        type: "standard",
        responses,
        synthesis: `This is a placeholder ensemble synthesis by ${leadName}. The lead model would combine insights from all ${responses.length} responses into a unified answer.`,
        synthesizedBy: leadName,
        agreement,
      }
      break
  }

  return {
    id: `turn-${Date.now()}`,
    userMessage: prompt,
    config: { ...config },
    result,
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
