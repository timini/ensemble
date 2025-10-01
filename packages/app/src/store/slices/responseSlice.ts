/**
 * Response Slice
 *
 * Manages AI responses and streaming state
 * NOT persisted (transient data)
 */

import type { StateCreator } from 'zustand';

export interface ModelResponse {
  modelId: string;
  provider: string;
  model: string;
  response: string;
  isStreaming: boolean;
  isComplete: boolean;
  responseTime: number | null;
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
  similarityMatrix: number[][] | null;
  agreementStats: AgreementStats | null;
  metaAnalysis: string | null;

  setPrompt: (prompt: string) => void;
  startStreaming: (modelId: string, provider: string, model: string) => void;
  appendStreamChunk: (modelId: string, chunk: string) => void;
  completeResponse: (modelId: string, responseTime: number) => void;
  setError: (modelId: string, error: string) => void;
  addManualResponse: (label: string, response: string) => void;
  removeManualResponse: (id: string) => void;
  setEmbeddings: (
    embeddings: Array<{ modelId: string; embedding: number[] }>,
  ) => void;
  calculateAgreement: () => void;
  setMetaAnalysis: (analysis: string) => void;
  clearResponses: () => void;
}

export const createResponseSlice: StateCreator<ResponseSlice> = (set, get) => ({
  prompt: null,
  responses: [],
  manualResponses: [],
  embeddings: [],
  similarityMatrix: null,
  agreementStats: null,
  metaAnalysis: null,

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
        response: '',
        isStreaming: true,
        isComplete: false,
        responseTime: null,
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

  completeResponse: (modelId, responseTime) => {
    set((state) => {
      const responses = state.responses.map((r) =>
        r.modelId === modelId
          ? { ...r, isStreaming: false, isComplete: true, responseTime }
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

  setEmbeddings: (embeddings) => {
    set({ embeddings });
  },

  calculateAgreement: () => {
    const state = get();
    const { embeddings } = state;

    if (embeddings.length < 2) {
      set({ similarityMatrix: null, agreementStats: null });
      return;
    }

    // Calculate cosine similarity matrix
    const n = embeddings.length;
    const matrix: number[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0),
    );

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i]![j] = 1.0;
        } else {
          const similarity = cosineSimilarity(
            embeddings[i]!.embedding,
            embeddings[j]!.embedding,
          );
          matrix[i]![j] = similarity;
        }
      }
    }

    // Calculate statistics (upper triangle only, excluding diagonal)
    const similarities: number[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        similarities.push(matrix[i]![j]!);
      }
    }

    const mean =
      similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    const sortedSims = [...similarities].sort((a, b) => a - b);
    const median =
      sortedSims.length % 2 === 0
        ? (sortedSims[sortedSims.length / 2 - 1]! +
            sortedSims[sortedSims.length / 2]!) /
          2
        : sortedSims[Math.floor(sortedSims.length / 2)]!;
    const min = Math.min(...similarities);
    const max = Math.max(...similarities);
    const variance =
      similarities.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
      similarities.length;
    const stddev = Math.sqrt(variance);

    set({
      similarityMatrix: matrix,
      agreementStats: { mean, median, min, max, stddev },
    });
  },

  setMetaAnalysis: (analysis) => {
    set({ metaAnalysis: analysis });
  },

  clearResponses: () => {
    set({
      prompt: null,
      responses: [],
      manualResponses: [],
      embeddings: [],
      similarityMatrix: null,
      agreementStats: null,
      metaAnalysis: null,
    });
  },
});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
