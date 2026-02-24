"use client"

import { useState } from "react"
import { Send, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfigSlideOver } from "./config-slide-over"
import type { EnsembleConfig } from "./chat-types"
import { ensembleModes, models } from "./chat-types"

interface ChatInputBarProps {
  config: EnsembleConfig
  onConfigChange: (config: EnsembleConfig) => void
  onSend: (prompt: string) => void
}

export function ChatInputBar({ config, onConfigChange, onSend }: ChatInputBarProps) {
  const [prompt, setPrompt] = useState("")
  const [showConfig, setShowConfig] = useState(false)

  const canSubmit = config.selectedModels.length >= 2 && prompt.trim().length > 0
  const modeName = ensembleModes.find((m) => m.id === config.mode)?.name ?? ""
  const leadName = models.find((m) => m.id === config.leadModel)?.name
  const summary = `${config.selectedModels.length} models \u00b7 ${modeName}${config.mode === "standard" && leadName ? ` \u00b7 ${leadName} leads` : ""}`

  const handleSend = () => {
    if (!canSubmit) return
    onSend(prompt.trim())
    setPrompt("")
  }

  return (
    <>
      <ConfigSlideOver
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        config={config}
        onConfigChange={onConfigChange}
      />

      <div className="sticky bottom-0 border-t bg-background">
        <div className="mx-auto max-w-5xl px-4 py-3">
          {/* Input row — buttons aligned with textarea */}
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="mb-0.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfig(!showConfig)}
              aria-label="Toggle ensemble config"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask your ensemble..."
              className="min-h-[44px] max-h-[160px] min-w-0 flex-1 resize-none border bg-muted/50 text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && canSubmit) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />

            <Button
              disabled={!canSubmit}
              onClick={handleSend}
              size="icon"
              className="mb-0.5 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary below the input row */}
          <p className="mt-1 pl-10 text-[11px] text-muted-foreground">{summary}</p>
        </div>
      </div>
    </>
  )
}
