/**
 * Workflow Slice Tests
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createWorkflowSlice, type WorkflowSlice } from '../slices/workflowSlice';

describe('workflowSlice', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    store = createStore<WorkflowSlice>()(createWorkflowSlice);
  });

  it('initializes with config step', () => {
    const state = store.getState();
    expect(state.currentStep).toBe('config');
    expect(state.stepsCompleted.config).toBe(false);
  });

  it('sets current step', () => {
    store.getState().setCurrentStep('ensemble');
    expect(store.getState().currentStep).toBe('ensemble');
  });

  it('completes a step', () => {
    store.getState().completeStep('config');
    expect(store.getState().stepsCompleted.config).toBe(true);
    expect(store.getState().stepsCompleted.ensemble).toBe(false);
  });

  it('completes multiple steps', () => {
    store.getState().completeStep('config');
    store.getState().completeStep('ensemble');

    const state = store.getState();
    expect(state.stepsCompleted.config).toBe(true);
    expect(state.stepsCompleted.ensemble).toBe(true);
    expect(state.stepsCompleted.prompt).toBe(false);
  });

  it('resets workflow', () => {
    store.getState().setCurrentStep('review');
    store.getState().completeStep('config');
    store.getState().completeStep('ensemble');
    store.getState().completeStep('prompt');

    store.getState().resetWorkflow();

    const state = store.getState();
    expect(state.currentStep).toBe('config');
    expect(state.stepsCompleted.config).toBe(false);
    expect(state.stepsCompleted.ensemble).toBe(false);
    expect(state.stepsCompleted.prompt).toBe(false);
    expect(state.stepsCompleted.review).toBe(false);
  });

  it('navigates through workflow sequentially', () => {
    store.getState().setCurrentStep('config');
    expect(store.getState().currentStep).toBe('config');

    store.getState().completeStep('config');
    store.getState().setCurrentStep('ensemble');
    expect(store.getState().currentStep).toBe('ensemble');

    store.getState().completeStep('ensemble');
    store.getState().setCurrentStep('prompt');
    expect(store.getState().currentStep).toBe('prompt');

    store.getState().completeStep('prompt');
    store.getState().setCurrentStep('review');
    expect(store.getState().currentStep).toBe('review');
  });
});
