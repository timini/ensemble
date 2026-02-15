import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

type Step = 'config' | 'ensemble' | 'prompt' | 'review';

interface ProgressStepsProps {
  currentStep: Step;
  fallbackStep?: Step;
  onStepClick?: (step: Step) => void;
}

function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

export function ProgressSteps({
  currentStep,
  fallbackStep,
  onStepClick,
}: ProgressStepsProps) {
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
    <div className="progress-steps flex flex-col items-center mb-12">
      {/* Circles and connectors row */}
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isClickable = Boolean(onStepClick && isCompleted);

          const circle = (
            <div
              data-testid={`workflow-step-${step.id}`}
              data-active={isActive}
              data-completed={isCompleted}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-colors${
                isCompleted
                  ? ' bg-success text-success-foreground'
                  : isActive
                    ? ' bg-primary text-primary-foreground'
                    : ' bg-muted text-muted-foreground'
              }${isClickable ? ' cursor-pointer hover:brightness-95' : ''}`}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" role="img" />
              ) : (
                step.number
              )}
            </div>
          );

          return (
            <div key={step.id} className="flex items-center">
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  data-testid={`progress-step-${step.id}`}
                  data-active={false}
                  data-completed={true}
                  aria-label={step.label}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {circle}
                </button>
              ) : (
                <div
                  data-testid={`progress-step-${step.id}`}
                  data-active={isActive}
                  data-completed={isCompleted}
                >
                  {circle}
                </div>
              )}
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-4 transition-colors ${
                  index < currentIndex ? 'bg-success' : 'bg-muted'
                }`}
              />
            )}
            </div>
          );
        })}
      </div>
      {/* Labels row */}
      <div className="flex items-start mt-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <span
              className={`inline-block w-12 text-center text-sm font-medium transition-colors ${
                index < currentIndex
                  ? 'text-success'
                  : index === currentIndex
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && <div className="w-16 mx-4" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Step, ProgressStepsProps };
