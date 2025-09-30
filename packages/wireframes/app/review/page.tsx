"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Share, Copy } from "lucide-react"
import { ProgressSteps } from "@/components/progress-steps"
import { EnsembleHeader } from "@/components/ensemble-header"

export default function ReviewPage() {
  const router = useRouter()
  const [prompt] = useState("test") // Mock prompt

  // Mock response data
  const consensusResponse =
    "Your question has a clear focus that allows for a direct response. We can examine this through multiple lenses: theoretical foundations, real-world examples, and future considerations. This comprehensive approach ensures that all relevant factors are taken into account when formulating a complete response."

  const responses = [
    {
      id: "claude-3-haiku",
      name: "Claude 3 Haiku",
      model: "claude-3-haiku-20240307",
      response:
        "This subject can be analyzed using established methodologies.\n\nWe can examine this through multiple lenses: theoretical foundations, real-world examples, and future considerations.\n\nThis comprehensive approach ensures that all relevant factors are taken into account when formulating a complete response.",
      rating: 0,
      responseTime: "1568ms",
    },
    {
      id: "claude-3-opus",
      name: "Claude 3 Opus",
      model: "claude-3-opus-20240229",
      response:
        "This is a straightforward topic that can be addressed systematically.\n\nThe analysis involves understanding the context, identifying patterns, and drawing meaningful conclusions.\n\nThis comprehensive approach ensures that all relevant factors are taken into account when formulating a complete response.",
      rating: 0,
      responseTime: "1368ms",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <EnsembleHeader />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <ProgressSteps currentStep="review" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ensemble Response</h2>
          <p className="text-gray-600">
            Compare each model&apos;s answer, inspect agreement, and read the consensus summary before finalising.
          </p>
        </div>

        {/* Your Prompt */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Your Prompt</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-900">{prompt}</p>
            </div>
          </CardContent>
        </Card>

        {/* Consensus */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 text-blue-900">Consensus</h3>
            <p className="text-sm text-blue-700 mb-4">Combined summary provided by Claude 3 Opus.</p>

            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-gray-900 leading-relaxed">{consensusResponse}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Share className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">Share this consensus response</span>
              </div>
              <Button variant="outline" size="sm" className="bg-white">
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Analysis */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold">Agreement analysis</h3>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-500">56%</div>
                  <div className="text-sm text-gray-500">Overall Agreement</div>
                  <div className="text-sm text-red-500">Low Agreement</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-4">Pairwise Comparisons</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">Claude 3 Haiku</span>
                    <span className="text-gray-400">vs</span>
                    <span className="text-sm">Claude 3 Opus</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: "56%" }}></div>
                    </div>
                    <span className="text-sm font-medium">56%</span>
                    <span className="text-xs text-gray-500">Confidence: 95%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">2</div>
                <div className="text-sm text-gray-500">RESPONSES ANALYZED</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">1</div>
                <div className="text-sm text-gray-500">COMPARISONS</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">95%</div>
                <div className="text-sm text-gray-500">AVG CONFIDENCE</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Responses */}
        <div className="mb-8">
          <h3 className="font-semibold mb-6">Individual Responses</h3>

          <div className="space-y-6">
            {responses.map((response) => (
              <Card key={response.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-semibold text-sm">A</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{response.name}</h4>
                        <p className="text-sm text-gray-500">{response.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Copy className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Expand</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    {response.response.split("\n\n").map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-gray-900 leading-relaxed mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Copy className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-500">Rate response:</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} className="text-gray-300 hover:text-yellow-400">
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">Response time: {response.responseTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/prompt")}>
            Back to Prompt
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline">New Comparison</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Start Over</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
