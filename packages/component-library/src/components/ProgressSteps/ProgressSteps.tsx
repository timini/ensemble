import { Check } from 'lucide-react';

type Step = 'config' | 'ensemble' | 'prompt' | 'review';

interface ProgressStepsProps {
  currentStep: Step;
}

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  const steps = [
    { id: 'config' as const, label: 'Config', number: 1 },
    { id: 'ensemble' as const, label: 'Ensemble', number: 2 },
    { id: 'prompt' as const, label: 'Prompt', number: 3 },
    { id: 'review' as const, label: 'Review', number: 4 },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                index < currentIndex
                  ? 'bg-green-500 text-white'
                  : index === currentIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}
            >
              {index < currentIndex ? (
                <Check className="w-4 h-4" role="img" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-2 text-sm font-medium transition-colors ${
                index < currentIndex
                  ? 'text-green-600'
                  : index === currentIndex
                    ? 'text-blue-600'
                    : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-4 transition-colors ${index < currentIndex ? 'bg-green-500' : 'bg-gray-300'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export type { Step, ProgressStepsProps };
