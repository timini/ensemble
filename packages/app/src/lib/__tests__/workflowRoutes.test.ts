import { describe, it, expect } from 'vitest';
import { STEP_ROUTES } from '../workflowRoutes';

describe('workflowRoutes', () => {
  it('maps each workflow step to the expected route', () => {
    expect(STEP_ROUTES).toEqual({
      config: '/config',
      ensemble: '/ensemble',
      prompt: '/prompt',
      review: '/review',
    });
  });

  it('contains only known workflow steps', () => {
    expect(Object.keys(STEP_ROUTES).sort()).toEqual([
      'config',
      'ensemble',
      'prompt',
      'review',
    ]);
  });

  it('uses unique routes for every workflow step', () => {
    const routes = Object.values(STEP_ROUTES);

    expect(new Set(routes).size).toBe(routes.length);
  });
});
