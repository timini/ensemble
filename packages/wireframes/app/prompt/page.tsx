"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ProgressSteps } from "@/components/progress-steps"

const selectedModels = ["gpt-4o", "gpt-4o-mini"]
const summarizerModel = "gpt-4o"

export default function PromptPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps currentStep="prompt" />

      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Enter Your Prompt</h2>
        <p className="mx-auto mt-3 max-w-3xl text-muted-foreground">Describe what you want the AI models to do.</p>
      </div>

      <div className="mt-8 space-y-8">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Prompt</h3>
              <span className="text-sm text-muted-foreground">Press Cmd+Enter to submit</span>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Enter your prompt here..."
              className="min-h-[220px]"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-primary">Tips for better prompts</h3>
            <p className="mt-2 text-sm text-primary/80">Small adjustments often lead to noticeably more aligned outputs.</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-primary/80">
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

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">Your Ensemble Configuration</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              These models will receive the prompt and contribute to the comparison.
            </p>

            <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 className="mb-2 text-sm font-semibold">Selected Models ({selectedModels.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map((model) => (
                    <Badge key={model} variant="outline" className="bg-muted">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Summarizer</h4>
                <Badge className="border-primary/30 bg-primary/10 text-primary">{summarizerModel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/ensemble")}>
          Back
        </Button>
        <Button disabled={!prompt.trim()} onClick={() => router.push("/review")}>
          Generate Responses
        </Button>
      </div>
    </div>
  )
}
