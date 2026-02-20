/**
 * Ensemble Slice
 *
 * Manages model selection and ensemble configuration
 */

import type { StateCreator } from 'zustand';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'perplexity';

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
  embeddingsProvider: ProviderType;
  savedEnsembles: SavedEnsemble[];
  currentEnsembleId: string | null;
  consensusMethod: ConsensusMethod;
  eloTopN: number;

  addModel: (provider: ProviderType, model: string) => void;
  removeModel: (modelId: string) => void;
  setSummarizer: (modelId: string) => void;
  setEmbeddingsProvider: (provider: ProviderType) => void;
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
  embeddingsProvider: 'openai',
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

  removeModel: (modelId) => {
    set((state) => ({
      selectedModels: state.selectedModels.filter((m) => m.id !== modelId),
      summarizerModel:
        state.summarizerModel === modelId ? null : state.summarizerModel,
    }));
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
      const id = `ensemble-${Date.now()}`;
      const newEnsemble: SavedEnsemble = {
        id,
        name,
        description,
        models: state.selectedModels,
        summarizer: state.summarizerModel ?? '',
        consensusMethod: state.consensusMethod,
        eloTopN: state.eloTopN,
      };
      return {
        savedEnsembles: [...state.savedEnsembles, newEnsemble],
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
        summarizerModel: ensemble.summarizer,
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
