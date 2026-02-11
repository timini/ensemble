import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '~/store';
import type { Step } from '@/components/molecules/ProgressSteps';

const ROUTE_TO_STEP: Record<string, Step> = {
  '/config': 'config',
  '/ensemble': 'ensemble',
  '/prompt': 'prompt',
  '/review': 'review',
};

/**
 * Syncs the Zustand currentStep with the current route pathname.
 * Call once in the root layout to keep the store truthful regardless
 * of how the user arrives at a page (direct URL, refresh, back button).
 */
export function useSyncStepWithRoute() {
  const pathname = usePathname();
  const setCurrentStep = useStore((state) => state.setCurrentStep);

  useEffect(() => {
    const step = ROUTE_TO_STEP[pathname];
    if (step) {
      setCurrentStep(step);
    }
  }, [pathname, setCurrentStep]);
}
