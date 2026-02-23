"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Eye, EyeOff, Info, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ProgressSteps } from "@/components/progress-steps"

type Mode = "free" | "pro"
type ProviderKey = "openai" | "anthropic" | "google" | "xai" | "deepseek" | "perplexity"

interface ApiKeyRow {
  provider: ProviderKey
  label: string
  placeholder: string
  value: string
  status: "valid" | "idle"
  helperText: string
}

const apiKeyRows: ApiKeyRow[] = [
  {
    provider: "openai",
    label: "OpenAI API Key",
    placeholder: "sk-...",
    value: "sk-proj-demo-free-mode-key",
    status: "valid",
    helperText: "API key configured",
  },
  {
    provider: "anthropic",
    label: "Anthropic API Key",
    placeholder: "sk-ant-...",
    value: "",
    status: "idle",
    helperText: "Enter your Anthropic API key",
  },
  {
    provider: "google",
    label: "Google (Gemini) API Key",
    placeholder: "AIza...",
    value: "",
    status: "idle",
    helperText: "Enter your Google AI API key",
  },
  {
    provider: "xai",
    label: "xAI API Key",
    placeholder: "xai-...",
    value: "",
    status: "idle",
    helperText: "Enter your xAI API key",
  },
  {
    provider: "deepseek",
    label: "DeepSeek API Key",
    placeholder: "sk-...",
    value: "",
    status: "idle",
    helperText: "Enter your DeepSeek API key",
  },
  {
    provider: "perplexity",
    label: "Perplexity API Key",
    placeholder: "pplx-...",
    value: "",
    status: "idle",
    helperText: "Enter your Perplexity API key",
  },
]

export default function ConfigPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("free")
  const [showApiKeys, setShowApiKeys] = useState<Record<ProviderKey, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    xai: false,
    deepseek: false,
    perplexity: false,
  })

  const configuredCount = apiKeyRows.filter((row) => row.status === "valid").length
  const allowContinue = configuredCount > 0 && mode === "free"

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps currentStep="config" />

      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Configuration</h2>
        <p className="mx-auto mt-3 max-w-3xl text-muted-foreground">
          Choose Free Mode to use your own API keys, or Pro Mode for managed access. Then continue to select your
          ensemble models.
        </p>
      </div>

      <section className="mt-8">
        <h3 className="mb-6 text-lg font-semibold">Select Your Mode</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className={mode === "free" ? "border-2 border-primary bg-primary/10" : "border-2 border-border"}>
            <CardContent className="flex h-full flex-col p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg">🔧</div>
                <h4 className="text-xl font-semibold">Free Mode</h4>
              </div>
              <p className="mb-6 flex-1 text-muted-foreground">
                Bring your own API keys. Your keys are encrypted locally and API calls go directly from your browser to
                each provider.
              </p>
              <Button onClick={() => setMode("free")}>Start in Free Mode</Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-border opacity-70">
            <CardContent className="flex h-full flex-col p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg">⭐</div>
                <h4 className="text-xl font-semibold">Pro Mode</h4>
              </div>
              <p className="mb-6 flex-1 text-muted-foreground">
                Managed backend mode with authentication, credit billing, and server-side provider orchestration.
              </p>
              <Button variant="outline" disabled onClick={() => setMode("pro")}>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {mode === "free" && (
        <section className="mt-8 space-y-6">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>{configuredCount} API key configured.</strong> Configure more or continue selecting models.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-5 text-sky-900">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Your API keys stay secure in Free Mode</p>
                <p className="mt-1 text-sm">
                  Before you add a key, here is exactly how Free Mode protects your credentials:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  <li>API keys never leave your browser.</li>
                  <li>Keys are encrypted locally with AES-256.</li>
                  <li>No keys are sent to or stored on Ensemble AI servers.</li>
                  <li>API requests are sent directly from your browser to each provider.</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-lg font-semibold">Configure API Keys</h3>
            <div className="space-y-5">
              {apiKeyRows.map((row) => {
                const isValid = row.status === "valid"
                const shouldShowValue = showApiKeys[row.provider]

                return (
                  <div key={row.provider}>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-medium">{row.label}</label>
                      {isValid && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Valid
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <Input
                        type={shouldShowValue ? "text" : "password"}
                        value={
                          row.value.length > 0
                            ? shouldShowValue
                              ? row.value
                              : "••••••••••••••••••••••••••••••••"
                            : ""
                        }
                        placeholder={row.placeholder}
                        readOnly
                        className={isValid ? "border-emerald-300 bg-emerald-50" : ""}
                      />

                      {row.value.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowApiKeys((prev) => ({
                              ...prev,
                              [row.provider]: !prev[row.provider],
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {shouldShowValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>

                    <p className={`mt-2 text-xs ${isValid ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {row.helperText}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <div className="mt-12 flex justify-end">
        <Button disabled={!allowContinue} onClick={() => router.push("/ensemble")}>
          Next
        </Button>
      </div>
    </div>
  )
}
