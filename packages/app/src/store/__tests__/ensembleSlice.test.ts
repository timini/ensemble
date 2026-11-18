/**
 * Ensemble Slice Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  createEnsembleSlice,
  type EnsembleSlice,
} from "../slices/ensembleSlice";

describe("ensembleSlice", () => {
  let store: StoreApi<EnsembleSlice>;

  beforeEach(() => {
    store = createStore<EnsembleSlice>()(createEnsembleSlice);
  });

  it("initializes with empty state", () => {
    const state = store.getState();
    expect(state.selectedModels).toEqual([]);
    expect(state.summarizerModel).toBeNull();
    expect(state.embeddingsProvider).toBe("auto");
    expect(state.savedEnsembles).toEqual([]);
    expect(state.currentEnsembleId).toBeNull();
  });

  it("adds a model", () => {
    store.getState().addModel("openai", "gpt-4o");
    const models = store.getState().selectedModels;

    expect(models).toHaveLength(1);
    expect(models[0]?.provider).toBe("openai");
    expect(models[0]?.model).toBe("gpt-4o");
    expect(models[0]?.id).toBeTruthy();
  });

  it("adds multiple models", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().addModel("anthropic", "claude-3-5-sonnet");
    store.getState().addModel("google", "gemini-1.5-pro");

    const models = store.getState().selectedModels;
    expect(models).toHaveLength(3);
  });

  it("removes a model", () => {
    store.getState().addModel("openai", "gpt-4o");
    const modelId = store.getState().selectedModels[0]!.id;

    store.getState().removeModel(modelId);
    expect(store.getState().selectedModels).toHaveLength(0);
  });

  it("sets summarizer model", () => {
    store.getState().addModel("openai", "gpt-4o");
    const modelId = store.getState().selectedModels[0]!.id;

    store.getState().setSummarizer(modelId);
    expect(store.getState().summarizerModel).toBe(modelId);
  });

  it("clears summarizer when removing model", () => {
    store.getState().addModel("openai", "gpt-4o");
    const modelId = store.getState().selectedModels[0]!.id;

    store.getState().setSummarizer(modelId);
    store.getState().removeModel(modelId);

    expect(store.getState().summarizerModel).toBeNull();
  });

  it("clears the summarizer when its model, chosen by model id, is removed", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().addModel("openai", "gpt-4o-mini");
    const [first] = store.getState().selectedModels;

    store.getState().setSummarizer("gpt-4o");
    store.getState().removeModel(first!.id);

    expect(store.getState().summarizerModel).toBeNull();
  });

  it("keeps the summarizer when another model is removed", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().addModel("openai", "gpt-4o-mini");
    const second = store.getState().selectedModels[1]!;

    store.getState().setSummarizer("gpt-4o");
    store.getState().removeModel(second.id);

    expect(store.getState().summarizerModel).toBe("gpt-4o");
  });

  it("sets embeddings provider", () => {
    store.getState().setEmbeddingsProvider("google");
    expect(store.getState().embeddingsProvider).toBe("google");
    store.getState().setEmbeddingsProvider("auto");
    expect(store.getState().embeddingsProvider).toBe("auto");
  });

  it("sets majority consensus method", () => {
    store.getState().setConsensusMethod("majority");
    expect(store.getState().consensusMethod).toBe("majority");
  });

  it("saves an ensemble", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().addModel("anthropic", "claude-3-5-sonnet");
    const modelId = store.getState().selectedModels[0]!.id;
    store.getState().setSummarizer(modelId);

    store.getState().saveEnsemble("My Ensemble", "Test description");

    const state = store.getState();
    expect(state.savedEnsembles).toHaveLength(1);
    expect(state.savedEnsembles[0]?.name).toBe("My Ensemble");
    expect(state.savedEnsembles[0]?.description).toBe("Test description");
    expect(state.savedEnsembles[0]?.models).toHaveLength(2);
    expect(state.currentEnsembleId).toBeTruthy();
  });

  it("loads a saved ensemble", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().saveEnsemble("Test", "Description");
    const ensembleId = store.getState().savedEnsembles[0]!.id;

    store.getState().clearSelection();
    expect(store.getState().selectedModels).toHaveLength(0);

    store.getState().loadEnsemble(ensembleId);
    expect(store.getState().selectedModels).toHaveLength(1);
    expect(store.getState().currentEnsembleId).toBe(ensembleId);
  });

  it("loads a preset saved with no summarizer as unset, not as an empty id", () => {
    store.getState().addModel("openai", "gpt-4o");
    expect(store.getState().summarizerModel).toBeNull();
    store.getState().saveEnsemble("No summarizer", "");
    expect(store.getState().savedEnsembles[0]?.summarizer).toBe("");

    store.getState().loadEnsemble(store.getState().savedEnsembles[0]!.id);
    expect(store.getState().summarizerModel).toBeNull();
  });

  it("deletes an ensemble", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().saveEnsemble("Test", "Description");
    const ensembleId = store.getState().savedEnsembles[0]!.id;

    store.getState().deleteEnsemble(ensembleId);
    expect(store.getState().savedEnsembles).toHaveLength(0);
    expect(store.getState().currentEnsembleId).toBeNull();
  });

  it("clears selection", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().addModel("anthropic", "claude-3-5-sonnet");
    const modelId = store.getState().selectedModels[0]!.id;
    store.getState().setSummarizer(modelId);
    store.getState().saveEnsemble("Test", "Description");

    store.getState().clearSelection();

    const state = store.getState();
    expect(state.selectedModels).toHaveLength(0);
    expect(state.summarizerModel).toBeNull();
    expect(state.currentEnsembleId).toBeNull();
  });

  it("replaces a saved ensemble when saving under the same name", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().saveEnsemble("Pair", "first");
    const firstId = store.getState().savedEnsembles[0]!.id;

    store.getState().addModel("anthropic", "claude-3-5-sonnet");
    store.getState().saveEnsemble("  Pair ", "second");

    const { savedEnsembles, currentEnsembleId } = store.getState();
    expect(savedEnsembles).toHaveLength(1);
    expect(savedEnsembles[0]?.id).toBe(firstId);
    expect(savedEnsembles[0]?.name).toBe("Pair");
    expect(savedEnsembles[0]?.description).toBe("second");
    expect(savedEnsembles[0]?.models).toHaveLength(2);
    expect(currentEnsembleId).toBe(firstId);
  });

  it("gives ensembles saved in the same millisecond different ids", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().saveEnsemble("One", "");
    store.getState().saveEnsemble("Two", "");

    const ids = store.getState().savedEnsembles.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("restores the consensus method and top N when loading", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().setConsensusMethod("elo");
    store.getState().setEloTopN(4);
    store.getState().saveEnsemble("Elo pair", "");
    const id = store.getState().savedEnsembles[0]!.id;

    store.getState().clearSelection();
    store.getState().loadEnsemble(id);

    expect(store.getState().consensusMethod).toBe("elo");
    expect(store.getState().eloTopN).toBe(4);
  });

  it("keeps the current selection when a saved ensemble is deleted", () => {
    store.getState().addModel("openai", "gpt-4o");
    store.getState().saveEnsemble("Test", "");
    const id = store.getState().savedEnsembles[0]!.id;

    store.getState().deleteEnsemble(id);

    expect(store.getState().selectedModels).toHaveLength(1);
  });
});
