import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Step } from '@/components/molecules/ProgressSteps';
import { useStore } from '~/store';
import { STEP_ROUTES } from '~/lib/workflowRoutes';

/**
 * Shared step-navigation handler for the workflow progress indicator.
 */
export function useStepNavigation() {
  const router = useRouter();
  const setCurrentStep = useStore((state) => state.setCurrentStep);

  return useCallback(
    (step: Step) => {
      setCurrentStep(step);
      router.push(STEP_ROUTES[step]);
    },
    [router, setCurrentStep],
  );
}
