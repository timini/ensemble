import { Check } from "lucide-react"

type Step = "config" | "ensemble" | "prompt" | "review"

interface ProgressStepsProps {
  currentStep: Step
}

const steps: Array<{ id: Step; label: string; number: number }> = [
  { id: "config", label: "Config", number: 1 },
  { id: "ensemble", label: "Ensemble", number: 2 },
  { id: "prompt", label: "Prompt", number: 3 },
  { id: "review", label: "Review", number: 4 },
]

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep)

  return (
    <div className="mb-12 flex flex-col items-center">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full font-semibold text-sm transition-colors">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.number}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mx-4 h-0.5 w-16 ${
                    index < currentIndex ? "bg-emerald-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-start">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <span
              className={`inline-block w-12 text-center text-sm font-medium ${
                index < currentIndex
                  ? "text-emerald-600"
                  : index === currentIndex
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && <div className="mx-4 w-16" />}
          </div>
        ))}
      </div>
    </div>
  )
}
