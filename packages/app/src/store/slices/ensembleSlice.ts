/**
 * Ensemble Slice
 *
 * Manages model selection and ensemble configuration
 */

import type { StateCreator } from 'zustand';
import type { EmbeddingsProviderPreference } from '@ensemble-ai/shared-utils/providers';

export type { EmbeddingsProviderPreference };

/**
 * Providers a model can come from. `openai-compatible` covers every
 * configured OpenAI-compatible endpoint; its model ids carry the endpoint id
 * as a prefix (`ollama/llama3.2:3b`).
 */
export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'perplexity'
  | 'openai-compatible';

/** Providers configured with a single API key (see apiKeySlice). Endpoints live in endpointsSlice. */
export type ApiKeyProvider = Exclude<ProviderType, 'openai-compatible'>;
export type ConsensusMethod = 'standard' | 'elo' | 'majority' | 'council';

export interface ModelSelection {
  id: string;
  provider: ProviderType;
  /** The model's API identifier (e.g., 'gpt-4o', 'gemini-2.5-flash'), not a display name */
  model: string;
}

export interface SavedEnsemble {
  id: string;
  name: string;
  description: string;
  models: ModelSelection[];
  summarizer: string;
  consensusMethod: ConsensusMethod;
  eloTopN: number;
}

export interface EnsembleSlice {
  selectedModels: ModelSelection[];
  summarizerModel: string | null;
  /** `auto` picks OpenAI, then Google, then an endpoint with an embedding model. */
  embeddingsProvider: EmbeddingsProviderPreference;
  savedEnsembles: SavedEnsemble[];
  currentEnsembleId: string | null;
  consensusMethod: ConsensusMethod;
  eloTopN: number;

  addModel: (provider: ProviderType, model: string) => void;
  removeModel: (modelId: string) => void;
  setSummarizer: (modelId: string) => void;
  setEmbeddingsProvider: (provider: EmbeddingsProviderPreference) => void;
  setConsensusMethod: (method: ConsensusMethod) => void;
  setEloTopN: (n: number) => void;
  saveEnsemble: (name: string, description: string) => void;
  loadEnsemble: (ensembleId: string) => void;
  deleteEnsemble: (ensembleId: string) => void;
  clearSelection: () => void;
}

export const createEnsembleSlice: StateCreator<EnsembleSlice> = (set) => ({
  selectedModels: [],
  summarizerModel: null,
  embeddingsProvider: 'auto',
  savedEnsembles: [],
  currentEnsembleId: null,
  consensusMethod: 'standard',
  eloTopN: 3,

  addModel: (provider, model) => {
    set((state) => {
      const id = `${provider}-${model}-${Date.now()}`;
      const newModel: ModelSelection = { id, provider, model };
      return {
        selectedModels: [...state.selectedModels, newModel],
      };
    });
  },

  // The summarizer is stored as a model id (setSummarizer); older code
  // stored the selection id, so both clear it.
  removeModel: (modelId) => {
    set((state) => {
      const removed = state.selectedModels.find((m) => m.id === modelId);
      const clears =
        state.summarizerModel === modelId ||
        state.summarizerModel === removed?.model;
      return {
        selectedModels: state.selectedModels.filter((m) => m.id !== modelId),
        summarizerModel: clears ? null : state.summarizerModel,
      };
    });
  },

  setSummarizer: (modelId) => {
    set({ summarizerModel: modelId });
  },

  setEmbeddingsProvider: (provider) => {
    set({ embeddingsProvider: provider });
  },

  setConsensusMethod: (method) => {
    set({ consensusMethod: method });
  },

  setEloTopN: (n) => {
    set({ eloTopN: n });
  },

  saveEnsemble: (name, description) => {
    set((state) => {
      const trimmedName = name.trim();
      // Saving under an existing name replaces that ensemble, keeping its id.
      const existing = state.savedEnsembles.find((e) => e.name === trimmedName);
      const id =
        existing?.id ??
        `ensemble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ensemble: SavedEnsemble = {
        id,
        name: trimmedName,
        description,
        models: state.selectedModels,
        summarizer: state.summarizerModel ?? '',
        consensusMethod: state.consensusMethod,
        eloTopN: state.eloTopN,
      };
      return {
        savedEnsembles: existing
          ? state.savedEnsembles.map((e) => (e.id === id ? ensemble : e))
          : [...state.savedEnsembles, ensemble],
        currentEnsembleId: id,
      };
    });
  },

  loadEnsemble: (ensembleId) => {
    set((state) => {
      const ensemble = state.savedEnsembles.find((e) => e.id === ensembleId);
      if (!ensemble) return state;

      return {
        selectedModels: ensemble.models,
        // A preset saved with no summarizer stores ''; treat it as unset so
        // the first model of the run summarises, as before saving.
        summarizerModel: ensemble.summarizer || null,
        currentEnsembleId: ensembleId,
        consensusMethod: ensemble.consensusMethod ?? 'standard',
        eloTopN: ensemble.eloTopN ?? 3,
      };
    });
  },

  deleteEnsemble: (ensembleId) => {
    set((state) => ({
      savedEnsembles: state.savedEnsembles.filter((e) => e.id !== ensembleId),
      currentEnsembleId:
        state.currentEnsembleId === ensembleId
          ? null
          : state.currentEnsembleId,
    }));
  },

  clearSelection: () => {
    set({
      selectedModels: [],
      summarizerModel: null,
      currentEnsembleId: null,
      consensusMethod: 'standard',
      eloTopN: 3,
    });
  },
});
