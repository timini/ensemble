"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import { ProgressSteps } from "@/components/progress-steps"
import { EnsembleHeader } from "@/components/ensemble-header"

interface Model {
  id: string
  name: string
  provider: string
  icon: string
}

export default function EnsemblePage() {
  const router = useRouter()
  const [selectedModels, setSelectedModels] = useState<string[]>(["claude-3-opus", "claude-3-haiku"])
  const [summarizerModel, setSummarizerModel] = useState<string>("claude-3-opus")
  const [ensembleName, setEnsembleName] = useState("")

  const models: Model[] = [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", icon: "🤖" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", icon: "🤖" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", icon: "🤖" },
    { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", icon: "🧠" },
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", icon: "🧠" },
    { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", icon: "🧠" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", icon: "🔍" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", icon: "🔍" },
    { id: "grok-beta", name: "Grok Beta", provider: "Grok", icon: "🚀" },
  ]

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId)
      } else {
        return [...prev, modelId]
      }
    })
  }

  const setSummarizer = (modelId: string) => {
    setSummarizerModel(modelId)
    if (!selectedModels.includes(modelId)) {
      setSelectedModels((prev) => [...prev, modelId])
    }
  }

  const getModelsByProvider = (provider: string) => {
    return models.filter((model) => model.provider === provider)
  }

  const getSelectedModelNames = () => {
    return models.filter((model) => selectedModels.includes(model.id)).map((model) => model.name)
  }

  const getSummarizerModelName = () => {
    return models.find((model) => model.id === summarizerModel)?.name || ""
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EnsembleHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <ProgressSteps currentStep="ensemble" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Select Models to Create Your Ensemble</h2>
          <p className="text-gray-600">
            Choose the AI models you want to include in your ensemble and select a summarizer.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Model Selection */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Select Models to Create Your Ensemble</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{selectedModels.length} selected</span>
                <span>6 available</span>
              </div>
            </div>

            {/* Summarizer Model */}
            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">⚡</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-orange-800">Summarizer Model:</span>
                    <span className="ml-2 font-semibold text-orange-900">{getSummarizerModelName()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* OpenAI Models */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">OpenAI</h4>
                <span className="text-sm text-blue-600">API key required</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {getModelsByProvider("OpenAI").map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedModels.includes(model.id) ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                    onClick={() => toggleModelSelection(model.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{model.icon}</div>
                      <div className="font-medium text-sm">{model.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Anthropic Models */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Anthropic</h4>
                <span className="text-sm text-blue-600">Ready</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {getModelsByProvider("Anthropic").map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-md relative ${
                      selectedModels.includes(model.id)
                        ? summarizerModel === model.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => toggleModelSelection(model.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{model.icon}</div>
                      <div className="font-medium text-sm">{model.name}</div>
                      {summarizerModel === model.id && (
                        <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs">Summarizer</Badge>
                      )}
                      {selectedModels.includes(model.id) && summarizerModel !== model.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSummarizer(model.id)
                          }}
                          className="absolute bottom-2 right-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Set as Summarizer
                        </button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Google Models */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Google</h4>
                <span className="text-sm text-blue-600">Ready</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {getModelsByProvider("Google").map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedModels.includes(model.id) ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                    onClick={() => toggleModelSelection(model.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{model.icon}</div>
                      <div className="font-medium text-sm">{model.name}</div>
                      {selectedModels.includes(model.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSummarizer(model.id)
                          }}
                          className="absolute bottom-2 right-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Set as Summarizer
                        </button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Grok Models */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Grok</h4>
                <span className="text-sm text-blue-600">Ready</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {getModelsByProvider("Grok").map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedModels.includes(model.id) ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                    onClick={() => toggleModelSelection(model.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{model.icon}</div>
                      <div className="font-medium text-sm">{model.name}</div>
                      {selectedModels.includes(model.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSummarizer(model.id)
                          }}
                          className="absolute bottom-2 right-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Set as Summarizer
                        </button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Ensemble Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Ensemble Summary</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Review your current selections before saving or continuing.
                </p>

                {/* Selected Models */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Selected Models ({selectedModels.length})</h4>
                    <span className="text-sm text-blue-600">Summarizer</span>
                  </div>
                  <div className="space-y-2">
                    {getSelectedModelNames().map((name, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{name}</span>
                        {models.find((m) => m.name === name)?.id === summarizerModel && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                            {name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-3">Quick presets</h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Start from a curated ensemble tuned for common workflows.
                  </p>

                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Research Synthesis</h5>
                        <Button variant="outline" size="sm" className="text-xs bg-transparent">
                          Use preset
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis.
                      </p>
                      <p className="text-xs text-gray-500">Summarizer: Claude 3.5 Sonnet</p>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Rapid Drafting</h5>
                        <Button variant="outline" size="sm" className="text-xs bg-transparent">
                          Use preset
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Fast, budget-friendly models tuned for quick ideation and iteration.
                      </p>
                      <p className="text-xs text-gray-500">Summarizer: GPT-4o Mini</p>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Balanced Perspective</h5>
                        <Button variant="outline" size="sm" className="text-xs bg-transparent">
                          Use preset
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Balanced trio for contrasting opinions and concise summaries.
                      </p>
                      <p className="text-xs text-gray-500">Summarizer: GPT-4o</p>
                    </div>
                  </div>
                </div>

                {/* Save Ensemble */}
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-3">Save current ensemble</h4>
                  <p className="text-xs text-gray-500 mb-3">Save this combination for future reviews.</p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Ensemble Name</label>
                      <Input
                        placeholder="e.g. Research Ensemble"
                        value={ensembleName}
                        onChange={(e) => setEnsembleName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button variant="outline" className="w-full text-sm bg-transparent">
                      Save Ensemble
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Save your favourite model combinations to load them instantly later.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manual Responses */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Manual Responses</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Add reference answers or benchmark outputs to include in the review step.
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Include custom responses to compare against live model outputs.
                  </p>
                  <Button variant="outline" className="w-full text-sm bg-transparent">
                    Add Manual Response
                  </Button>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Add reference answers or benchmark outputs to compare against live model responses.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => router.push("/config")}>
            Back to Configuration
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/prompt")}>
            Continue to Prompt
          </Button>
        </div>
      </div>
    </div>
  )
}
