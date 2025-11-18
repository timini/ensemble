/**
 * Mode Slice Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createModeSlice, type ModeSlice } from '../slices/modeSlice';

describe('modeSlice', () => {
  let store: StoreApi<ModeSlice>;

  beforeEach(() => {
    store = createStore<ModeSlice>()(createModeSlice);
  });

  it('initializes with free mode', () => {
    const state = store.getState();
    expect(state.mode).toBe('free');
    expect(state.isModeConfigured).toBe(false);
  });

  it('sets mode to pro', () => {
    store.getState().setMode('pro');
    expect(store.getState().mode).toBe('pro');
  });

  it('sets mode to free', () => {
    store.getState().setMode('pro');
    store.getState().setMode('free');
    expect(store.getState().mode).toBe('free');
  });

  it('marks mode as configured', () => {
    store.getState().configureModeComplete();
    expect(store.getState().isModeConfigured).toBe(true);
  });

  it('completes mode configuration flow', () => {
    store.getState().setMode('pro');
    store.getState().configureModeComplete();

    const state = store.getState();
    expect(state.mode).toBe('pro');
    expect(state.isModeConfigured).toBe(true);
  });
});
