"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Layers, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProgressSteps } from "@/components/progress-steps"

type Provider = "openai" | "anthropic" | "google" | "xai" | "deepseek" | "perplexity"

interface Model {
  id: string
  provider: Provider
  name: string
}

const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "XAI",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
}

const providerStatus: Record<Provider, "Ready" | "API key required"> = {
  openai: "Ready",
  anthropic: "API key required",
  google: "API key required",
  xai: "API key required",
  deepseek: "API key required",
  perplexity: "API key required",
}

const models: Model[] = [
  { id: "gpt-4o", provider: "openai", name: "GPT-4o" },
  { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o Mini" },
  { id: "claude-3.5-sonnet", provider: "anthropic", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-haiku", provider: "anthropic", name: "Claude 3 Haiku" },
  { id: "gemini-2.0-flash", provider: "google", name: "Gemini 2.0 Flash" },
  { id: "gemini-1.5-pro", provider: "google", name: "Gemini 1.5 Pro" },
  { id: "grok-2", provider: "xai", name: "Grok 2" },
  { id: "deepseek-chat", provider: "deepseek", name: "DeepSeek Chat" },
  { id: "sonar", provider: "perplexity", name: "Perplexity Sonar" },
]

const presets = [
  {
    id: "research",
    name: "Research Synthesis",
    description: "Deep reasoning stack for long-form synthesis.",
    summarizer: "GPT-4o",
  },
  {
    id: "drafting",
    name: "Rapid Drafting",
    description: "Fast and lightweight set for quick iteration.",
    summarizer: "GPT-4o Mini",
  },
]

export default function EnsemblePage() {
  const router = useRouter()
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt-4o", "gpt-4o-mini"])
  const [summarizerModel, setSummarizerModel] = useState<string>("gpt-4o")

  const groupedModels = useMemo(() => {
    return models.reduce<Record<Provider, Model[]>>(
      (acc, model) => {
        acc[model.provider].push(model)
        return acc
      },
      {
        openai: [],
        anthropic: [],
        google: [],
        xai: [],
        deepseek: [],
        perplexity: [],
      },
    )
  }, [])

  const selectedModelDetails = useMemo(
    () => models.filter((model) => selectedModels.includes(model.id)),
    [selectedModels],
  )

  const isValid = selectedModels.length >= 2

  const toggleModelSelection = (model: Model) => {
    const lockedByProvider = providerStatus[model.provider] !== "Ready"
    if (lockedByProvider && !selectedModels.includes(model.id)) {
      return
    }

    setSelectedModels((prev) => {
      if (prev.includes(model.id)) {
        const next = prev.filter((id) => id !== model.id)
        if (summarizerModel === model.id && next.length > 0) {
          setSummarizerModel(next[0] as string)
        }
        return next
      }
      return [...prev, model.id]
    })
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps currentStep="ensemble" />

      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Build Your Ensemble</h2>
        <p className="mx-auto mt-3 max-w-3xl text-muted-foreground">
          Select at least 2 AI models to compare their responses.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900">
        <p className="font-semibold">How model selection works</p>
        <p className="mt-1 text-sm">Choose at least 2 models to continue, and mix providers for broader perspective.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedModels.length} of {models.length} models selected
            </p>
          </div>

          {(Object.keys(groupedModels) as Provider[]).map((provider) => {
            const providerModels = groupedModels[provider]
            if (providerModels.length === 0) return null

            return (
              <section key={provider} className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg font-semibold">{providerLabels[provider]}</h4>
                  {providerStatus[provider] === "Ready" ? (
                    <span className="text-sm font-medium text-emerald-600">✓ Ready</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">API key required</span>
                      <Button variant="outline" size="sm" onClick={() => router.push("/config")}>
                        Configure
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {providerModels.map((model) => {
                    const isSelected = selectedModels.includes(model.id)
                    const isSummarizer = summarizerModel === model.id
                    const isLocked = providerStatus[provider] !== "Ready" && !isSelected

                    return (
                      <Card
                        key={model.id}
                        className={`cursor-pointer transition-all ${
                          isLocked
                            ? "opacity-60"
                            : isSelected
                              ? isSummarizer
                                ? "border-orange-500 bg-orange-50"
                                : "border-primary bg-primary/10"
                              : "hover:border-primary/40"
                        }`}
                        onClick={() => toggleModelSelection(model)}
                      >
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{model.name}</p>
                            {isSummarizer && (
                              <Badge className="border-orange-200 bg-orange-100 text-orange-700">Summarizer</Badge>
                            )}
                          </div>

                          {isSelected && !isSummarizer && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSummarizerModel(model.id)
                              }}
                            >
                              Set as summarizer
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Ensemble Summary</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Review your current selections before saving or continuing.
              </p>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Selected Models ({selectedModelDetails.length})</h4>
                  {selectedModelDetails.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => setSelectedModels([])}
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {selectedModelDetails.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No models selected yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pick at least 2 models to start comparing.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedModelDetails.map((model) => (
                      <div key={model.id} className="flex items-center justify-between text-sm">
                        <span>{model.name}</span>
                        <div className="flex items-center gap-1">
                          {model.id === summarizerModel && (
                            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                              Summarizer
                            </Badge>
                          )}
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setSelectedModels((prev) => prev.filter((id) => id !== model.id))}
                            aria-label={`Remove ${model.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <h4 className="text-sm font-semibold">Quick presets</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start from a curated ensemble tuned for common workflows.
                </p>
                <div className="mt-3 space-y-3">
                  {presets.map((preset) => (
                    <div key={preset.id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{preset.name}</p>
                        <Button variant="outline" size="sm">
                          Use preset
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Summarizer: {preset.summarizer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h4 className="text-sm font-semibold">Manual Responses</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add reference answers or benchmark outputs to include in review.
                </p>
                <Button variant="outline" className="mt-3 w-full">
                  <Plus className="h-4 w-4" />
                  Add Manual Response
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/config")}>
          Back
        </Button>
        <Button disabled={!isValid} onClick={() => router.push("/prompt")}>
          Next
        </Button>
      </div>
    </div>
  )
}
