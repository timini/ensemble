"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EnsembleConfigPanel } from "@/components/ensemble-config-panel"
import type { EnsembleConfig } from "./chat-types"

interface ConfigSlideOverProps {
  isOpen: boolean
  onClose: () => void
  config: EnsembleConfig
  onConfigChange: (config: EnsembleConfig) => void
}

export function ConfigSlideOver({ isOpen, onClose, config, onConfigChange }: ConfigSlideOverProps) {
  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, right panel on desktop */}
      <aside
        className={`fixed z-50 flex flex-col border-border bg-background shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        } inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[560px] md:rounded-none md:border-l md:border-t-0`}
        aria-label="Ensemble configuration"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Ensemble Config</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close config">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable body — remove inner border since slide-over provides framing */}
        <div className="flex-1 overflow-y-auto p-6 [&>div]:border-0 [&>div]:p-0">
          <EnsembleConfigPanel config={config} onChange={onConfigChange} />
        </div>
      </aside>
    </>
  )
}
