/**
 * Ensemble Slice Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createEnsembleSlice, type EnsembleSlice } from '../slices/ensembleSlice';

describe('ensembleSlice', () => {
  let store: StoreApi<EnsembleSlice>;

  beforeEach(() => {
    store = createStore<EnsembleSlice>()(createEnsembleSlice);
  });

  it('initializes with empty state', () => {
    const state = store.getState();
    expect(state.selectedModels).toEqual([]);
    expect(state.summarizerModel).toBeNull();
    expect(state.embeddingsProvider).toBe('openai');
    expect(state.savedEnsembles).toEqual([]);
    expect(state.currentEnsembleId).toBeNull();
  });

  it('adds a model', () => {
    store.getState().addModel('openai', 'gpt-4o');
    const models = store.getState().selectedModels;

    expect(models).toHaveLength(1);
    expect(models[0]?.provider).toBe('openai');
    expect(models[0]?.model).toBe('gpt-4o');
    expect(models[0]?.id).toBeTruthy();
  });

  it('adds multiple models', () => {
    store.getState().addModel('openai', 'gpt-4o');
    store.getState().addModel('anthropic', 'claude-3-5-sonnet');
    store.getState().addModel('google', 'gemini-1.5-pro');

    const models = store.getState().selectedModels;
    expect(models).toHaveLength(3);
  });

  it('removes a model', () => {
    store.getState().addModel('openai', 'gpt-4o');
    const modelId = store.getState().selectedModels[0]!.id;

    store.getState().removeModel(modelId);
    expect(store.getState().selectedModels).toHaveLength(0);
  });

  it('sets summarizer model', () => {
    store.getState().addModel('openai', 'gpt-4o');
    const modelId = store.getState().selectedModels[0]!.id;

    store.getState().setSummarizer(modelId);
    expect(store.getState().summarizerModel).toBe(modelId);
  });

  it('clears summarizer when removing model', () => {
    store.getState().addModel('openai', 'gpt-4o');
    const modelId = store.getState().selectedModels[0]!.id;

    store.getState().setSummarizer(modelId);
    store.getState().removeModel(modelId);

    expect(store.getState().summarizerModel).toBeNull();
  });

  it('sets embeddings provider', () => {
    store.getState().setEmbeddingsProvider('anthropic');
    expect(store.getState().embeddingsProvider).toBe('anthropic');
  });

  it('saves an ensemble', () => {
    store.getState().addModel('openai', 'gpt-4o');
    store.getState().addModel('anthropic', 'claude-3-5-sonnet');
    const modelId = store.getState().selectedModels[0]!.id;
    store.getState().setSummarizer(modelId);

    store.getState().saveEnsemble('My Ensemble', 'Test description');

    const state = store.getState();
    expect(state.savedEnsembles).toHaveLength(1);
    expect(state.savedEnsembles[0]?.name).toBe('My Ensemble');
    expect(state.savedEnsembles[0]?.description).toBe('Test description');
    expect(state.savedEnsembles[0]?.models).toHaveLength(2);
    expect(state.currentEnsembleId).toBeTruthy();
  });

  it('loads a saved ensemble', () => {
    store.getState().addModel('openai', 'gpt-4o');
    store.getState().saveEnsemble('Test', 'Description');
    const ensembleId = store.getState().savedEnsembles[0]!.id;

    store.getState().clearSelection();
    expect(store.getState().selectedModels).toHaveLength(0);

    store.getState().loadEnsemble(ensembleId);
    expect(store.getState().selectedModels).toHaveLength(1);
    expect(store.getState().currentEnsembleId).toBe(ensembleId);
  });

  it('deletes an ensemble', () => {
    store.getState().addModel('openai', 'gpt-4o');
    store.getState().saveEnsemble('Test', 'Description');
    const ensembleId = store.getState().savedEnsembles[0]!.id;

    store.getState().deleteEnsemble(ensembleId);
    expect(store.getState().savedEnsembles).toHaveLength(0);
    expect(store.getState().currentEnsembleId).toBeNull();
  });

  it('clears selection', () => {
    store.getState().addModel('openai', 'gpt-4o');
    store.getState().addModel('anthropic', 'claude-3-5-sonnet');
    const modelId = store.getState().selectedModels[0]!.id;
    store.getState().setSummarizer(modelId);
    store.getState().saveEnsemble('Test', 'Description');

    store.getState().clearSelection();

    const state = store.getState();
    expect(state.selectedModels).toHaveLength(0);
    expect(state.summarizerModel).toBeNull();
    expect(state.currentEnsembleId).toBeNull();
  });
});
