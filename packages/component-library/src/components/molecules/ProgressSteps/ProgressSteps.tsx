import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Step = 'config' | 'ensemble' | 'prompt' | 'review';

/** Props for the ProgressSteps workflow indicator. */
interface ProgressStepsProps {
  /** The currently active step in the workflow. */
  currentStep: Step;
  /** Step to display before client hydration (avoids flash). */
  fallbackStep?: Step;
  /** Called when a completed step circle is clicked for navigation. */
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
          const isClickable = onStepClick && isCompleted;

          const circle = (
            <div
              data-testid={`progress-step-circle-${step.id}`}
              data-active={isActive}
              data-completed={isCompleted}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                isCompleted && 'bg-success text-success-foreground',
                isActive && 'bg-primary text-primary-foreground',
                !isCompleted && !isActive && 'bg-muted text-muted-foreground',
                isClickable && 'cursor-pointer hover:brightness-95',
              )}
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
                  data-testid={`progress-step-container-${step.id}`}
                  data-active={isActive}
                  data-completed={isCompleted}
                  aria-label={`Navigate to ${step.label} step`}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  {circle}
                </button>
              ) : (
                <div
                  data-testid={`progress-step-container-${step.id}`}
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
