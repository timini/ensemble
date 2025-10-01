import * as React from 'react';
import { Button } from '../../atoms/Button';
import { cn } from '@/lib/utils';

export type WorkflowStep = 'config' | 'ensemble' | 'prompt' | 'review';

export interface WorkflowNavigatorProps {
  /** Current step in the workflow */
  currentStep: WorkflowStep;
  /** Label for the back button */
  backLabel?: string;
  /** Label for the continue button */
  continueLabel?: string;
  /** Whether the continue button is disabled */
  continueDisabled?: boolean;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Callback when continue button is clicked */
  onContinue?: () => void;
}

/**
 * WorkflowNavigator organism for navigating between workflow steps.
 *
 * Composes Button atoms to create a navigation bar with Back and Continue buttons.
 * The Config step only shows Continue, while other steps show both buttons.
 *
 * @example
 * ```tsx
 * <WorkflowNavigator
 *   currentStep="ensemble"
 *   backLabel="Back to Configuration"
 *   continueLabel="Continue to Prompt"
 *   onBack={() => router.push('/config')}
 *   onContinue={() => router.push('/prompt')}
 * />
 * ```
 */
export const WorkflowNavigator = React.forwardRef<HTMLElement, WorkflowNavigatorProps>(
  (
    {
      currentStep,
      backLabel,
      continueLabel = 'Continue',
      continueDisabled = false,
      onBack,
      onContinue,
    },
    ref
  ) => {
    const showBackButton = currentStep !== 'config' && onBack;

    return (
      <nav
        ref={ref}
        data-testid="workflow-navigator"
        className={cn(
          'flex',
          showBackButton ? 'justify-between' : 'justify-end'
        )}
      >
        {showBackButton && (
          <Button
            variant="outline"
            onClick={onBack}
          >
            {backLabel}
          </Button>
        )}

        {onContinue && (
          <Button
            variant="default"
            onClick={onContinue}
            disabled={continueDisabled}
          >
            {continueLabel}
          </Button>
        )}
      </nav>
    );
  }
);

WorkflowNavigator.displayName = 'WorkflowNavigator';
