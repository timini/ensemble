"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ProgressSteps } from "@/components/progress-steps"
import { EnsembleHeader } from "@/components/ensemble-header"

export default function PromptPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")

  // Mock data - in a real app this would come from state management
  const selectedModels = ["claude-3-haiku-20240307", "claude-3-opus-20240229"]
  const summarizerModel = "claude-3-opus-20240229"

  return (
    <div className="min-h-screen bg-gray-50">
      <EnsembleHeader />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <ProgressSteps currentStep="prompt" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Create Your Prompt</h2>
          <p className="text-gray-600">Enter the question or brief you want to send to every model in your ensemble.</p>
        </div>

        {/* Ensemble Configuration Summary */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Your Ensemble Configuration</h3>
            <p className="text-sm text-gray-600 mb-4">
              These models will receive the prompt and contribute to the comparison.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm mb-2">Selected Models ({selectedModels.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map((model, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-50">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Summarizer</h4>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">{summarizerModel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prompt Input */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Enter Your Prompt</h3>
            <span className="text-sm text-gray-500">⌘+Enter to submit</span>
          </div>

          <Textarea
            placeholder="Enter your prompt here... For example: 'Explain quantum computing in simple terms' or 'Write a short story about a robot learning to paint'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[200px] text-base"
          />
        </div>

        {/* Tips */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-blue-900">Tips for better prompts</h3>
            <p className="text-sm text-blue-800 mb-4">
              Small adjustments often lead to noticeably more aligned outputs.
            </p>

            <ul className="space-y-2 text-sm text-blue-800">
              <li>
                <strong>Be specific and clear about the desired outcome.</strong>
              </li>
              <li>
                <strong>Provide context, examples, or constraints when they matter.</strong>
              </li>
              <li>
                <strong>Experiment with tone: analytical, conversational, or creative.</strong>
              </li>
              <li>
                <strong>Iterate on length and structure to probe different behaviours.</strong>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/ensemble")}>
            Back to Model Selection
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/review")}
            disabled={!prompt.trim()}
          >
            Generate Responses
          </Button>
        </div>
      </div>
    </div>
  )
}
