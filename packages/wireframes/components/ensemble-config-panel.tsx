"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Plus, Search, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  type EnsembleConfig,
  type EnsembleMode,
  type Model,
  type Provider,
  ensembleModes,
  models,
  presets,
  providerColors,
  providerLabels,
} from "@/components/chat/chat-types"

interface EnsembleConfigPanelProps {
  config: EnsembleConfig
  onChange: (config: EnsembleConfig) => void
}

export function EnsembleConfigPanel({ config, onChange }: EnsembleConfigPanelProps) {
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const [showPresets, setShowPresets] = useState(false)

  const selectedModelObjects = useMemo(
    () => config.selectedModels.map((id) => models.find((m) => m.id === id)).filter(Boolean) as Model[],
    [config.selectedModels],
  )

  const groupedModels = useMemo(() => {
    return models.reduce<Record<Provider, Model[]>>(
      (acc, model) => { acc[model.provider].push(model); return acc },
      { openai: [], anthropic: [], google: [], xai: [], deepseek: [], perplexity: [] },
    )
  }, [])

  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return groupedModels
    const q = modelSearch.toLowerCase()
    const filtered: Record<Provider, Model[]> = { openai: [], anthropic: [], google: [], xai: [], deepseek: [], perplexity: [] }
    for (const [provider, providerModels] of Object.entries(groupedModels)) {
      filtered[provider as Provider] = providerModels.filter(
        (m) => m.name.toLowerCase().includes(q) || providerLabels[m.provider].toLowerCase().includes(q),
      )
    }
    return filtered
  }, [groupedModels, modelSearch])

  const removeModel = (modelId: string) => {
    const next = config.selectedModels.filter((id) => id !== modelId)
    const nextLead = config.leadModel === modelId
      ? next.length > 0 ? next[0]! : ""
      : config.leadModel
    // Reset mode to standard if model count drops below minModels
    const currentModeMin = ensembleModes.find((m) => m.id === config.mode)?.minModels ?? 2
    const nextMode = next.length < currentModeMin ? "standard" : config.mode
    onChange({ ...config, selectedModels: next, leadModel: nextLead, mode: nextMode })
  }

  const addModel = (modelId: string) => {
    if (!config.selectedModels.includes(modelId)) {
      onChange({ ...config, selectedModels: [...config.selectedModels, modelId] })
    }
    setShowModelPicker(false)
    setModelSearch("")
  }

  const applyPreset = (modelIds: string[]) => {
    const lead = modelIds.length > 0 && !modelIds.includes(config.leadModel) ? modelIds[0]! : config.leadModel
    onChange({ ...config, selectedModels: modelIds, leadModel: lead })
    setShowPresets(false)
  }

  const setMode = (mode: EnsembleMode) => onChange({ ...config, mode })
  const setLead = (id: string) => onChange({ ...config, leadModel: id })
  const modeDisabled = (mode: typeof ensembleModes[number]) => config.selectedModels.length < mode.minModels
  const leadModelObj = models.find((m) => m.id === config.leadModel)

  return (
    <div className="space-y-6 rounded-lg border border-border p-4">
      {/* Model strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your Ensemble</h3>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowPresets(!showPresets)}>
              Load preset <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {showPresets && (
              <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-lg border bg-background p-2 shadow-lg">
                {presets.map((preset) => (
                  <button key={preset.id} type="button" className="w-full rounded-md px-3 py-2 text-left hover:bg-muted" onClick={() => applyPreset(preset.models)}>
                    <p className="text-sm font-medium">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.models.length} models</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          {selectedModelObjects.map((model) => {
            const isLead = model.id === config.leadModel
            return (
              <div key={model.id} className={`relative flex min-w-[140px] flex-col rounded-lg border-2 px-4 py-3 ${providerColors[model.provider]} ${isLead ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                <button type="button" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background hover:bg-foreground" onClick={() => removeModel(model.id)} aria-label={`Remove ${model.name}`}>
                  <X className="h-3 w-3" />
                </button>
                <span className="text-sm font-semibold">{model.name}</span>
                <span className="text-xs text-muted-foreground">{providerLabels[model.provider]}</span>
                {isLead ? (
                  <Badge variant="outline" className="mt-1.5 w-fit gap-1 border-primary/40 text-xs"><Star className="h-3 w-3 fill-primary text-primary" />Lead</Badge>
                ) : (
                  <button type="button" className="mt-1.5 text-left text-xs text-muted-foreground hover:text-foreground" onClick={() => setLead(model.id)}>Set as lead</button>
                )}
              </div>
            )
          })}

          {/* Add model */}
          <div className="relative">
            <button type="button" className="flex min-h-[80px] min-w-[100px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-3 text-muted-foreground transition-colors hover:border-primary hover:text-primary" onClick={() => setShowModelPicker(!showModelPicker)}>
              <Plus className="h-5 w-5" /><span className="text-xs font-medium">Add</span>
            </button>
            {showModelPicker && (
              <div className="absolute left-0 top-full z-30 mt-2 w-80 rounded-lg border bg-background shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h4 className="font-semibold">Add Model</h4>
                  <button type="button" onClick={() => { setShowModelPicker(false); setModelSearch("") }}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="border-b px-4 py-2">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Search models..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} autoFocus />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {(Object.keys(filteredModels) as Provider[]).map((provider) => {
                    const pm = filteredModels[provider]
                    if (pm.length === 0) return null
                    return (
                      <div key={provider} className="mb-2">
                        <div className="px-2 py-1"><span className="text-xs font-semibold text-muted-foreground">{providerLabels[provider]}</span></div>
                        {pm.map((m) => {
                          const added = config.selectedModels.includes(m.id)
                          return (
                            <button key={m.id} type="button" disabled={added} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted disabled:opacity-50" onClick={() => addModel(m.id)}>
                              <span>{m.name}</span>
                              {added ? <span className="text-xs text-muted-foreground">Added</span> : <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Add</span>}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ensemble Mode */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Ensemble Mode</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ensembleModes.map((mode) => {
            const disabled = modeDisabled(mode)
            const selected = config.mode === mode.id
            return (
              <button key={mode.id} type="button" disabled={disabled} className={`rounded-lg border-2 p-3 text-left transition-all ${disabled ? "cursor-not-allowed opacity-50" : selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`} onClick={() => !disabled && setMode(mode.id)}>
                <div className="mb-1 flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                  <span className="text-xs font-semibold">{mode.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
                {disabled && <p className="mt-1 text-xs text-destructive">Needs {mode.minModels}+ models</p>}
              </button>
            )
          })}
        </div>
        {config.mode === "standard" && config.selectedModels.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span>Lead: <strong className="text-foreground">{leadModelObj?.name}</strong></span>
            <span className="text-xs">(click a model card above to change)</span>
          </div>
        )}
      </div>
    </div>
  )
}
