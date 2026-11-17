/**
 * Response Slice
 *
 * Manages AI responses and streaming state.
 *
 * This slice is persisted to localStorage with the rest of the store (see
 * src/store/index.ts). The inline script in src/app/layout.tsx clears the
 * prompt and the response fields when /review is opened by a fresh navigation
 * (navigation type "navigate"). Reloads, back/forward loads and client-side
 * navigation keep the persisted data.
 */

import type { StateCreator } from "zustand";
import type { TokenUsage } from "@ensemble-ai/shared-utils/providers";
import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import {
  agreementStatistics,
  similarityMatrix as buildSimilarityMatrix,
} from "@ensemble-ai/shared-utils/similarity";
import { toError } from "~/lib/errors";
import { logger } from "~/lib/logger";
import type { ProviderType } from "./ensembleSlice";

export interface ModelResponse {
  modelId: string;
  provider: ProviderType;
  model: string;
  response: string;
  isStreaming: boolean;
  isComplete: boolean;
  responseTime: number | null;
  tokenCount: number | null;
  /**
   * Input and output tokens reported by the provider, or null when it
   * reported none. Missing in runs persisted before usage was recorded.
   */
  usage?: TokenUsage | null;
  error: string | null;
}

export interface ManualResponse {
  id: string;
  label: string;
  response: string;
}

export interface AgreementStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  stddev: number;
}

export interface ResponseSlice {
  prompt: string | null;
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  embeddings: Array<{ modelId: string; embedding: number[] }>;
  /** Provider that produced `embeddings`, or null when unknown. */
  embeddingsSource: string | null;
  similarityMatrix: number[][] | null;
  agreementStats: AgreementStats | null;
  metaAnalysis: string | null;
  /** Token usage of each consensus call in the current run. */
  consensusUsage: CallUsage[];

  setPrompt: (prompt: string) => void;
  startStreaming: (
    modelId: string,
    provider: ProviderType,
    model: string,
  ) => void;
  appendStreamChunk: (modelId: string, chunk: string) => void;
  completeResponse: (
    modelId: string,
    responseTime: number,
    tokenCount?: number,
    usage?: TokenUsage,
  ) => void;
  setError: (modelId: string, error: string) => void;
  addManualResponse: (label: string, response: string) => void;
  removeManualResponse: (id: string) => void;
  setEmbeddings: (
    embeddings: Array<{ modelId: string; embedding: number[] }>,
    source?: string | null,
  ) => void;
  calculateAgreement: () => void;
  setMetaAnalysis: (analysis: string) => void;
  addConsensusUsage: (call: CallUsage) => void;
  clearConsensusUsage: () => void;
  clearResponses: () => void;
  resetStreamingState: () => void;
}

export const createResponseSlice: StateCreator<ResponseSlice> = (set, get) => ({
  prompt: null,
  responses: [],
  manualResponses: [],
  embeddings: [],
  embeddingsSource: null,
  similarityMatrix: null,
  agreementStats: null,
  metaAnalysis: null,
  consensusUsage: [],

  setPrompt: (prompt) => {
    set({ prompt });
  },

  startStreaming: (modelId, provider, model) => {
    set((state) => {
      const existingIndex = state.responses.findIndex(
        (r) => r.modelId === modelId,
      );

      if (existingIndex >= 0) {
        const updated = [...state.responses];
        updated[existingIndex] = {
          ...updated[existingIndex]!,
          isStreaming: true,
          isComplete: false,
          error: null,
        };
        return { responses: updated };
      }

      const newResponse: ModelResponse = {
        modelId,
        provider,
        model,
        response: "",
        isStreaming: true,
        isComplete: false,
        responseTime: null,
        tokenCount: null,
        usage: null,
        error: null,
      };

      return { responses: [...state.responses, newResponse] };
    });
  },

  appendStreamChunk: (modelId, chunk) => {
    set((state) => {
      const responses = state.responses.map((r) =>
        r.modelId === modelId ? { ...r, response: r.response + chunk } : r,
      );
      return { responses };
    });
  },

  completeResponse: (modelId, responseTime, tokenCount, usage) => {
    set((state) => {
      const responses = state.responses.map((r) =>
        r.modelId === modelId
          ? {
              ...r,
              isStreaming: false,
              isComplete: true,
              responseTime,
              tokenCount: tokenCount ?? null,
              usage: usage ?? null,
            }
          : r,
      );
      return { responses };
    });
  },

  setError: (modelId, error) => {
    set((state) => {
      const responses = state.responses.map((r) =>
        r.modelId === modelId
          ? { ...r, isStreaming: false, isComplete: true, error }
          : r,
      );
      return { responses };
    });
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
    set((state) => ({
      manualResponses: state.manualResponses.filter((m) => m.id !== id),
    }));
  },

  setEmbeddings: (embeddings, source = null) => {
    set({ embeddings, embeddingsSource: source });
  },

  calculateAgreement: () => {
    const { embeddings } = get();

    if (embeddings.length < 2) {
      set({ similarityMatrix: null, agreementStats: null });
      return;
    }

    try {
      const matrix = buildSimilarityMatrix(
        embeddings.map((entry) => entry.embedding),
      );
      set({
        similarityMatrix: matrix,
        agreementStats: agreementStatistics(upperTriangle(matrix)),
      });
    } catch (error: unknown) {
      // Mismatched or zero vectors cannot be compared. Show no score rather
      // than a wrong one.
      logger.error("Unable to calculate agreement", toError(error));
      set({ similarityMatrix: null, agreementStats: null });
    }
  },

  setMetaAnalysis: (analysis) => {
    set({ metaAnalysis: analysis });
  },

  addConsensusUsage: (call) => {
    set((state) => ({ consensusUsage: [...state.consensusUsage, call] }));
  },

  clearConsensusUsage: () => {
    set({ consensusUsage: [] });
  },

  resetStreamingState: () => {
    set({
      consensusUsage: [],
      responses: [],
      embeddings: [],
      embeddingsSource: null,
      similarityMatrix: null,
      agreementStats: null,
      metaAnalysis: null,
    });
  },

  clearResponses: () => {
    set({ prompt: null, manualResponses: [] });
    get().resetStreamingState();
  },
});

/** Pairwise values above the diagonal of a square matrix. */
function upperTriangle(matrix: number[][]): number[] {
  const values: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      values.push(matrix[i]![j]!);
    }
  }
  return values;
}
