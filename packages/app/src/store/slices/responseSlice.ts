/**
 * Response Slice
 *
 * Manages AI responses and streaming state.
 *
 * This slice is persisted to localStorage with the rest of the store (see
 * src/store/index.ts), so the last run survives a reload or a later visit to
 * /review. Submitting a new prompt calls startRun, which clears the old
 * answers, embeddings, agreement and consensus and records the run's
 * prompt. When the store loads, markInterruptedStreams turns any answer that
 * was still streaming into an `interrupted` error, since a fresh page has no
 * live streams.
 */

import type { StateCreator } from "zustand";
import { agreementFromEmbeddings } from "./agreementState";
import {
  withChunk,
  withCompleted,
  withError,
  withStreamStarted,
} from "./answerUpdates";
import type { ModelSelection } from "./ensembleSlice";
import type { ResponseSlice } from "./responseSliceState";
import type { ManualResponse } from "./responseTypes";

export type {
  AgreementStats,
  ManualResponse,
  ModelResponse,
} from "./responseTypes";
export type {
  ConsensusSettings,
  HistoryView,
  ResponseSlice,
} from "./responseSliceState";

/**
 * Prompt of the run on /review, or null when there is no submitted run.
 * Runs stored before runPrompt existed have answers but no runPrompt; only
 * those fall back to the draft. An unsubmitted draft never counts as a run,
 * so /review does not start streams for it.
 */
export function selectRunPrompt(state: {
  runPrompt?: string | null;
  prompt: string | null;
  responses: unknown[];
}): string | null {
  if (state.runPrompt) return state.runPrompt;
  return state.responses.length > 0 ? state.prompt : null;
}

/**
 * Models of the run on screen. Runs stored before runModels existed have
 * model answers but no models recorded, and use the current selection, as
 * they always did. A run of manual answers alone has no models.
 */
export function selectRunModels(state: {
  runModels?: ModelSelection[];
  selectedModels: ModelSelection[];
  responses: unknown[];
}): ModelSelection[] {
  if (state.runModels && state.runModels.length > 0) return state.runModels;
  return state.responses.length > 0 ? state.selectedModels : NO_MODELS;
}

const NO_MODELS: ModelSelection[] = [];

export const createResponseSlice: StateCreator<ResponseSlice> = (set, get) => ({
  prompt: null,
  runPrompt: null,
  runModels: [],
  runStartedAt: null,
  responses: [],
  manualResponses: [],
  embeddings: [],
  embeddingsSource: null,
  embeddingsModel: null,
  similarityMatrix: null,
  agreementStats: null,
  metaAnalysis: null,
  consensusSettings: null,
  consensusUsage: [],
  majorityVote: null,
  historyView: null,

  setPrompt: (prompt) => {
    set({ prompt });
  },

  // The draft takes the submitted (trimmed) text too, so the two never
  // differ by whitespace alone.
  startRun: (prompt, models = []) => {
    get().resetStreamingState();
    set({
      runPrompt: prompt,
      prompt,
      runModels: models,
      runStartedAt: Date.now(),
    });
  },

  startStreaming: (modelId, provider, model) => {
    set((state) => ({
      responses: withStreamStarted(state.responses, modelId, provider, model),
    }));
  },

  appendStreamChunk: (modelId, chunk) => {
    set((state) => ({ responses: withChunk(state.responses, modelId, chunk) }));
  },

  completeResponse: (modelId, responseTime, tokenCount, usage) => {
    set((state) => ({
      responses: withCompleted(
        state.responses,
        modelId,
        responseTime,
        tokenCount,
        usage,
      ),
    }));
  },

  setError: (modelId, error, details) => {
    set((state) => ({
      responses: withError(state.responses, modelId, error, details),
    }));
  },

  addManualResponse: (label, response) => {
    set((state) => {
      const id = `manual-${Date.now()}`;
      const newManual: ManualResponse = { id, label, response };
      return {
        manualResponses: [...state.manualResponses, newManual],
      };
    });
  },

  removeManualResponse: (id) => {
    set((state) => {
      const embeddings = state.embeddings.filter((e) => e.modelId !== id);
      return {
        manualResponses: state.manualResponses.filter((m) => m.id !== id),
        embeddings,
        ...agreementFromEmbeddings(embeddings),
      };
    });
  },

  clearManualResponses: () => {
    set({ manualResponses: [] });
  },

  setEmbeddings: (embeddings, source = null, model = null) => {
    set({ embeddings, embeddingsSource: source, embeddingsModel: model });
  },

  calculateAgreement: () => {
    set(agreementFromEmbeddings(get().embeddings));
  },

  setMetaAnalysis: (analysis, settings) => {
    set({ metaAnalysis: analysis, consensusSettings: settings ?? null });
  },

  addConsensusUsage: (call) => {
    set((state) => ({ consensusUsage: [...state.consensusUsage, call] }));
  },

  setMajorityVote: (vote) => {
    set({ majorityVote: vote });
  },

  clearConsensus: () => {
    set({ metaAnalysis: null, consensusSettings: null, majorityVote: null });
  },

  resetStreamingState: () => {
    set({
      runPrompt: null,
      runModels: [],
      runStartedAt: null,
      historyView: null,
      consensusUsage: [],
      majorityVote: null,
      responses: [],
      embeddings: [],
      embeddingsSource: null,
      embeddingsModel: null,
      similarityMatrix: null,
      agreementStats: null,
      metaAnalysis: null,
      consensusSettings: null,
    });
  },

  clearResponses: () => {
    set({ prompt: null, runPrompt: null, manualResponses: [] });
    get().resetStreamingState();
  },
});
