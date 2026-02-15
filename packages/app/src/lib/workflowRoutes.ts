import type { Step } from '@/components/molecules/ProgressSteps';

export const STEP_ROUTES: Record<Step, string> = {
  config: '/config',
  ensemble: '/ensemble',
  prompt: '/prompt',
  review: '/review',
};
