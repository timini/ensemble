import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

type Step = 'config' | 'ensemble' | 'prompt' | 'review';

interface ProgressStepsProps {
  currentStep: Step;
  fallbackStep?: Step;
}

function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

export function ProgressSteps({ currentStep, fallbackStep }: ProgressStepsProps) {
  const { t } = useTranslation();
  const hasHydrated = useHasHydrated();

  const steps = [
    { id: 'config' as const, label: t('ensemble.steps.config'), number: 1 },
    { id: 'ensemble' as const, label: t('ensemble.steps.ensemble'), number: 2 },
    { id: 'prompt' as const, label: t('ensemble.steps.prompt'), number: 3 },
    { id: 'review' as const, label: t('ensemble.steps.review'), number: 4 },
  ];

  const displayStep = hasHydrated ? currentStep : fallbackStep ?? currentStep;

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === displayStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="progress-steps flex items-center justify-center mb-12">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className="flex flex-col items-center"
            data-testid={`progress-step-${step.id}`}
            data-active={index === currentIndex}
            data-completed={index < currentIndex}
          >
            <div
              className="flex flex-col items-center"
              data-testid={`workflow-step-${step.id}`}
              data-active={index === currentIndex}
              data-completed={index < currentIndex}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                  index < currentIndex
                    ? 'bg-green-500 text-white dark:bg-green-600'
                    : index === currentIndex
                      ? 'bg-blue-500 text-white dark:bg-blue-600'
                      : 'bg-muted text-muted-foreground'
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
                    ? 'text-green-600 dark:text-green-400'
                    : index === currentIndex
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-4 transition-colors ${
                index < currentIndex
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export type { Step, ProgressStepsProps };
