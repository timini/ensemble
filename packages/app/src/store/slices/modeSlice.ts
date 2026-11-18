/**
 * Mode Slice
 *
 * Manages operating mode selection (Free vs Pro)
 * Mock mode is development-only and not exposed to users
 */

import type { StateCreator } from "zustand";

export type OperatingMode = "free" | "pro";

export interface ModeSlice {
  mode: OperatingMode;
  isModeConfigured: boolean;
  setMode: (mode: OperatingMode) => void;
  configureModeComplete: () => void;
  /** The first-run onboarding sheet was finished or skipped. Persisted. */
  onboardingDone: boolean;
  completeOnboarding: () => void;
}

export const createModeSlice: StateCreator<ModeSlice> = (set) => ({
  mode: "free",
  isModeConfigured: false,
  onboardingDone: false,

  completeOnboarding: () => {
    set({ onboardingDone: true });
  },

  setMode: (mode) => {
    set({ mode });
  },

  configureModeComplete: () => {
    set({ isModeConfigured: true });
  },
});
