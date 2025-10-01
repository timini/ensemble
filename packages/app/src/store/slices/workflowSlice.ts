/**
 * Workflow Slice
 *
 * Manages user progress through the 4-step workflow:
 * Config → Ensemble → Prompt → Review
 */

import type { StateCreator } from 'zustand';

export type WorkflowStep = 'config' | 'ensemble' | 'prompt' | 'review';

export interface WorkflowSlice {
  currentStep: WorkflowStep;
  stepsCompleted: {
    config: boolean;
    ensemble: boolean;
    prompt: boolean;
    review: boolean;
  };
  setCurrentStep: (step: WorkflowStep) => void;
  completeStep: (step: WorkflowStep) => void;
  resetWorkflow: () => void;
}

export const createWorkflowSlice: StateCreator<WorkflowSlice> = (set) => ({
  currentStep: 'config',
  stepsCompleted: {
    config: false,
    ensemble: false,
    prompt: false,
    review: false,
  },

  setCurrentStep: (step) => {
    set({ currentStep: step });
  },

  completeStep: (step) => {
    set((state) => ({
      stepsCompleted: {
        ...state.stepsCompleted,
        [step]: true,
      },
    }));
  },

  resetWorkflow: () => {
    set({
      currentStep: 'config',
      stepsCompleted: {
        config: false,
        ensemble: false,
        prompt: false,
        review: false,
      },
    });
  },
});
