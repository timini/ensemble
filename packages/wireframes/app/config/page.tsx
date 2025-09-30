"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, CheckCircle, HelpCircle } from "lucide-react"
import { ProgressSteps } from "@/components/progress-steps"
import { EnsembleHeader } from "@/components/ensemble-header"

export default function ConfigPage() {
  const router = useRouter()
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    grok: false,
  })

  const [apiKeys] = useState({
    openai: "sk-proj-...",
    anthropic: "sk-ant-...",
    google: "AIza...",
    grok: "xai-...",
  })

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [provider]: !prev[provider as keyof typeof prev],
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EnsembleHeader />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <ProgressSteps currentStep="config" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Configure Your AI Ensemble</h2>
          <p className="text-gray-600">
            Choose your preferred mode and configure provider access before selecting models.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-6">Select Your Mode</h3>

          <div className="grid grid-cols-2 gap-6">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🔧</span>
                  </div>
                  <h4 className="text-xl font-semibold">Free Mode</h4>
                </div>
                <p className="text-gray-600 mb-6">
                  Bring your own API keys. Completely secure, your keys are encrypted and never leave your browser.
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Start in Free Mode</Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">⭐</span>
                  </div>
                  <h4 className="text-xl font-semibold">Pro Mode</h4>
                </div>
                <p className="text-gray-600 mb-6">
                  Buy credits to get access to the latest models across all providers.
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Go Pro</Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API Keys Configuration */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-6">Configure API Keys</h3>

          <div className="space-y-6">
            {/* OpenAI */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">OpenAI</h4>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="relative">
                <Input
                  type={showApiKeys.openai ? "text" : "password"}
                  value={showApiKeys.openai ? apiKeys.openai : "••••••••••••••••••••••••••••••••••••••••"}
                  className="pr-20 border-green-300 bg-green-50"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <button
                    onClick={() => toggleApiKeyVisibility("openai")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
            </div>

            {/* Anthropic */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">Anthropic</h4>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="relative">
                <Input
                  type={showApiKeys.anthropic ? "text" : "password"}
                  value={showApiKeys.anthropic ? apiKeys.anthropic : "••••••••••••••••••••••••••••••••••••••••"}
                  className="pr-20 border-green-300 bg-green-50"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <button
                    onClick={() => toggleApiKeyVisibility("anthropic")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showApiKeys.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
            </div>

            {/* Google (Gemini) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">Google (Gemini)</h4>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="relative">
                <Input
                  type={showApiKeys.google ? "text" : "password"}
                  value={showApiKeys.google ? apiKeys.google : "••••••••••••••••••••••••••••••••••••••••"}
                  className="pr-20 border-green-300 bg-green-50"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <button
                    onClick={() => toggleApiKeyVisibility("google")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showApiKeys.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
            </div>

            {/* Grok */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">Grok</h4>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="relative">
                <Input
                  type={showApiKeys.grok ? "text" : "password"}
                  value={showApiKeys.grok ? apiKeys.grok : "••••••••••••••••••••••••••••••••••••••••"}
                  className="pr-20 border-green-300 bg-green-50"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <button onClick={() => toggleApiKeyVisibility("grok")} className="text-gray-400 hover:text-gray-600">
                    {showApiKeys.grok ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/ensemble")}>
            Choose Your AI Models
          </Button>
        </div>
      </div>
    </div>
  )
}
