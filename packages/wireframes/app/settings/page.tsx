"use client"

import { useState } from "react"
import { Shield, Eye, EyeOff, CheckCircle, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Tab = "account" | "api-keys" | "usage"
type ProviderKey = "openai" | "anthropic" | "google" | "xai" | "deepseek" | "perplexity"

interface ApiKeyRow {
  provider: ProviderKey
  label: string
  placeholder: string
  value: string
  status: "valid" | "idle"
}

const apiKeyRows: ApiKeyRow[] = [
  {
    provider: "openai",
    label: "OpenAI",
    placeholder: "sk-proj-...",
    value: "sk-proj-...demo",
    status: "valid",
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    value: "",
    status: "idle",
  },
  {
    provider: "google",
    label: "Google (Gemini)",
    placeholder: "AIza...",
    value: "",
    status: "idle",
  },
  {
    provider: "xai",
    label: "xAI",
    placeholder: "xai-...",
    value: "",
    status: "idle",
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    placeholder: "sk-...",
    value: "",
    status: "idle",
  },
  {
    provider: "perplexity",
    label: "Perplexity",
    placeholder: "pplx-...",
    value: "",
    status: "idle",
  },
]

const tabs: { key: Tab; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "api-keys", label: "API Keys" },
  { key: "usage", label: "Usage & Credits" },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("account")
  const [showApiKeys, setShowApiKeys] = useState<Record<ProviderKey, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    xai: false,
    deepseek: false,
    perplexity: false,
  })

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      {/* Tab bar */}
      <div className="mt-6 border-b">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-8">
        {activeTab === "account" && <AccountTab />}
        {activeTab === "api-keys" && (
          <ApiKeysTab showApiKeys={showApiKeys} setShowApiKeys={setShowApiKeys} />
        )}
        {activeTab === "usage" && <UsageTab />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Account Tab                                                        */
/* ------------------------------------------------------------------ */

function AccountTab() {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Name</label>
          <p className="mt-1 text-base font-medium">Jane Doe</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <p className="mt-1 text-base font-medium">jane@example.com</p>
        </div>
        <div className="pt-2">
          <Button variant="outline">Sign out</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  API Keys Tab                                                       */
/* ------------------------------------------------------------------ */

function ApiKeysTab({
  showApiKeys,
  setShowApiKeys,
}: {
  showApiKeys: Record<ProviderKey, boolean>
  setShowApiKeys: React.Dispatch<React.SetStateAction<Record<ProviderKey, boolean>>>
}) {
  return (
    <div className="space-y-6">
      {/* Security banner */}
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Your API keys are encrypted locally (AES-256). Keys never leave your browser.
          </p>
        </div>
      </div>

      {/* API key rows */}
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
                    {shouldShowValue ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Usage & Credits Tab                                                */
/* ------------------------------------------------------------------ */

function UsageTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Credits remaining</h3>
          </div>
          <p className="mt-2 text-4xl font-bold">47</p>
          <Button className="mt-4" size="sm">
            Buy more credits
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Usage this month</h3>
          <p className="mt-2 text-2xl font-bold">153 requests</p>

          <div className="mt-6">
            <h4 className="mb-3 text-sm font-medium">Cost breakdown</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span>OpenAI</span>
                <span className="text-muted-foreground">89 requests</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Anthropic</span>
                <span className="text-muted-foreground">34 requests</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Google</span>
                <span className="text-muted-foreground">30 requests</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
