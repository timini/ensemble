"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { EnsembleConfigPanel } from "@/components/ensemble-config-panel"
import { type EnsembleConfig, ensembleModes, models } from "@/components/chat/chat-types"

const SUGGESTIONS = [
  "What are the tradeoffs between PostgreSQL and MongoDB?",
  "Explain transformer attention mechanisms simply",
  "Should I use microservices or a monolith?",
  "Compare React, Vue, and Svelte for a new project",
]

interface LandingViewProps {
  isSignedIn: boolean
  config: EnsembleConfig
  onConfigChange: (config: EnsembleConfig) => void
  onSend: (prompt: string) => void
}

export function LandingView({ isSignedIn, config, onConfigChange, onSend }: LandingViewProps) {
  const [prompt, setPrompt] = useState("")
  const [showConfig, setShowConfig] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const canSubmit = isSignedIn && config.selectedModels.length >= 2 && prompt.trim().length > 0
  const selectedNames = config.selectedModels.map((id) => models.find((m) => m.id === id)?.name).filter(Boolean).join(" + ")
  const modeName = ensembleModes.find((m) => m.id === config.mode)?.name ?? ""
  const leadName = models.find((m) => m.id === config.leadModel)?.name
  const configSummary = `${config.selectedModels.length} models \u00b7 ${modeName}${config.mode === "standard" && leadName ? ` \u00b7 ${leadName} leads` : ""}`

  const handleSend = () => {
    if (!canSubmit) return
    onSend(prompt.trim())
    setPrompt("")
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Hero */}
      <section className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Every AI model. One place.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          {isSignedIn
            ? "Ask once \u2014 get the best answer from all of them."
            : "Stop juggling ChatGPT, Claude, and Gemini subscriptions. Ask once \u2014 get the best answer from all of them."}
        </p>
      </section>

      {/* Prompt */}
      <section className="mb-4">
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isSignedIn ? "Ask your ensemble..." : "Ask anything..."}
              className="min-h-[120px] border-0 bg-transparent text-base focus-visible:ring-0"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canSubmit) { e.preventDefault(); handleSend() } }}
            />
            <div className="mt-3 flex items-center justify-end">
              {isSignedIn ? (
                <Button disabled={!canSubmit} onClick={handleSend}>
                  <Send className="mr-1.5 h-4 w-4" />Send
                </Button>
              ) : (
                <Button asChild><Link href="/auth/sign-up">Sign up to send</Link></Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Suggestion chips */}
      {isSignedIn && prompt.trim().length === 0 && (
        <section className="mb-4 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </section>
      )}

      {/* Config summary */}
      {isSignedIn ? (
        <p className="mb-6 text-center text-sm text-muted-foreground">{configSummary}</p>
      ) : (
        <p className="mb-6 text-center text-sm text-muted-foreground">Powered by {selectedNames} &middot; Standard mode</p>
      )}

      {/* Sign-up CTA (signed out) */}
      {!isSignedIn && (
        <section className="mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold">Get started</h3>
              <p className="mt-2 text-sm text-muted-foreground">Sign up to get 50 free queries across every AI model.</p>
              <Button className="mt-4 gap-2" size="lg" asChild>
                <Link href="/auth/sign-up">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Link>
              </Button>
              <div className="mt-4 flex flex-col items-center gap-1 text-sm text-muted-foreground">
                <span>Already have an account?{" "}<Link href="/auth/sign-in" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Sign in</Link></span>
                <span>Prefer your own API keys?{" "}<Link href="/settings" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Add them in Settings</Link></span>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Customise ensemble (signed in) */}
      {isSignedIn && (
        <section className="mb-8">
          <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setShowConfig(!showConfig)}>
            {showConfig ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Customise ensemble
          </button>
          {showConfig && <div className="mt-4"><EnsembleConfigPanel config={config} onChange={onConfigChange} /></div>}
        </section>
      )}

      {/* How it works */}
      <section className="mb-8">
        <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setShowHowItWorks(!showHowItWorks)}>
          {showHowItWorks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          How it works
        </button>
        {showHowItWorks && (
          <ol className="mt-3 list-inside list-decimal space-y-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <li>You ask a question</li>
            <li>Multiple AI models respond independently</li>
            <li>A lead model synthesises the best answer</li>
            <li>You see the ensemble answer + individual responses + agreement analysis</li>
          </ol>
        )}
      </section>
    </div>
  )
}
