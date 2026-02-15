import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Step } from '@/components/molecules/ProgressSteps';
import { useStore } from '~/store';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useStepNavigation } from '../useStepNavigation';

describe('useStepNavigation', () => {
  const setCurrentStep = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ setCurrentStep });
  });

  it.each([
    ['config', '/config'],
    ['ensemble', '/ensemble'],
    ['prompt', '/prompt'],
    ['review', '/review'],
  ] as const)('sets current step and navigates to %s', (step, route) => {
    const { result } = renderHook(() => useStepNavigation());

    act(() => {
      result.current(step);
    });

    expect(setCurrentStep).toHaveBeenCalledWith(step);
    expect(mockPush).toHaveBeenCalledWith(route);
  });

  it('sets step before navigation', () => {
    const { result } = renderHook(() => useStepNavigation());

    act(() => {
      result.current('prompt' as Step);
    });

    expect(setCurrentStep).toHaveBeenCalledWith('prompt');
    expect(mockPush).toHaveBeenCalledWith('/prompt');

    const setCallOrder = setCurrentStep.mock.invocationCallOrder[0];
    const pushCallOrder = mockPush.mock.invocationCallOrder[0];

    expect(setCallOrder).toBeDefined();
    expect(pushCallOrder).toBeDefined();

    if (setCallOrder === undefined || pushCallOrder === undefined) {
      throw new Error('Expected call order data for both mocks');
    }

    expect(setCallOrder).toBeLessThan(pushCallOrder);
  });
});
