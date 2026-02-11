import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStore } from '~/store';

const mockUsePathname = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

import { useSyncStepWithRoute } from '../useSyncStepWithRoute';

describe('useSyncStepWithRoute', () => {
  const setCurrentStep = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ setCurrentStep });
  });

  it('sets currentStep to config for /config', () => {
    mockUsePathname.mockReturnValue('/config');
    renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).toHaveBeenCalledWith('config');
  });

  it('sets currentStep to ensemble for /ensemble', () => {
    mockUsePathname.mockReturnValue('/ensemble');
    renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).toHaveBeenCalledWith('ensemble');
  });

  it('sets currentStep to prompt for /prompt', () => {
    mockUsePathname.mockReturnValue('/prompt');
    renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).toHaveBeenCalledWith('prompt');
  });

  it('sets currentStep to review for /review', () => {
    mockUsePathname.mockReturnValue('/review');
    renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).toHaveBeenCalledWith('review');
  });

  it('does not call setCurrentStep for unknown routes', () => {
    mockUsePathname.mockReturnValue('/unknown');
    renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).not.toHaveBeenCalled();
  });

  it('does not call setCurrentStep for root path', () => {
    mockUsePathname.mockReturnValue('/');
    renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).not.toHaveBeenCalled();
  });

  it('updates when pathname changes', () => {
    mockUsePathname.mockReturnValue('/config');
    const { rerender } = renderHook(() => useSyncStepWithRoute());
    expect(setCurrentStep).toHaveBeenCalledWith('config');

    mockUsePathname.mockReturnValue('/prompt');
    rerender();
    expect(setCurrentStep).toHaveBeenCalledWith('prompt');
  });
});
