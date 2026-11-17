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
import type { TokenUsage } from "@ensemble-ai/shared-utils/providers";
import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import { agreementFromEmbeddings } from "./agreementState";
import type { MajorityVoteRecord } from "~/lib/majorityVote";
import type { ProviderType } from "./ensembleSlice";
import type { ResponseErrorDetails } from "./responseErrorState";
import type { AgreementStats, ManualResponse, ModelResponse } from "./responseTypes";

export type { AgreementStats, ManualResponse, ModelResponse } from "./responseTypes";

export interface ResponseSlice {
  /** Prompt draft on /prompt, saved as the user types. */
  prompt: string | null;
  /**
   * Prompt the current run was submitted with, or null. Kept apart from the
   * draft so editing the next prompt never relabels the last run's answers.
   */
  runPrompt: string | null;
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
  /** Vote breakdown of the last majority consensus, or null. */
  majorityVote: MajorityVoteRecord | null;

  setPrompt: (prompt: string) => void;
  /** Starts a new run: clears the previous results and records its prompt. */
  startRun: (prompt: string) => void;
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
  setError: (
    modelId: string,
    error: string,
    details?: ResponseErrorDetails,
  ) => void;
  addManualResponse: (label: string, response: string) => void;
  removeManualResponse: (id: string) => void;
  setEmbeddings: (
    embeddings: Array<{ modelId: string; embedding: number[] }>,
    source?: string | null,
  ) => void;
  calculateAgreement: () => void;
  setMetaAnalysis: (analysis: string) => void;
  addConsensusUsage: (call: CallUsage) => void;
  setMajorityVote: (vote: MajorityVoteRecord | null) => void;
  /**
   * Drops the consensus text and majority vote so consensus runs again (for
   * example after a failed model is retried). Billed usage is kept.
   */
  clearConsensus: () => void;
  clearResponses: () => void;
  resetStreamingState: () => void;
}

/** Fields of an answer when its stream starts or restarts. */
const STREAM_START = {
  response: "",
  isStreaming: true,
  isComplete: false,
  responseTime: null,
  tokenCount: null,
  usage: null,
  error: null,
  errorKind: null,
  retryAfterSeconds: null,
} as const;

export const createResponseSlice: StateCreator<ResponseSlice> = (set, get) => ({
  prompt: null,
  runPrompt: null,
  responses: [],
  manualResponses: [],
  embeddings: [],
  embeddingsSource: null,
  similarityMatrix: null,
  agreementStats: null,
  metaAnalysis: null,
  consensusUsage: [],
  majorityVote: null,

  setPrompt: (prompt) => {
    set({ prompt });
  },

  startRun: (prompt) => {
    get().resetStreamingState();
    set({ runPrompt: prompt });
  },

  // A new answer, and a restart (retry), start from an empty answer.
  startStreaming: (modelId, provider, model) => {
    set((state) => {
      if (state.responses.some((r) => r.modelId === modelId)) {
        return {
          responses: state.responses.map((r) =>
            r.modelId === modelId ? { ...r, ...STREAM_START } : r,
          ),
        };
      }
      return {
        responses: [
          ...state.responses,
          { modelId, provider, model, ...STREAM_START },
        ],
      };
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

  setError: (modelId, error, details) => {
    set((state) => {
      const responses = state.responses.map((r) =>
        r.modelId === modelId
          ? {
              ...r,
              isStreaming: false,
              isComplete: true,
              error,
              errorKind: details?.kind ?? "other",
              retryAfterSeconds: details?.retryAfterSeconds ?? null,
            }
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
    set(agreementFromEmbeddings(get().embeddings));
  },

  setMetaAnalysis: (analysis) => {
    set({ metaAnalysis: analysis });
  },

  addConsensusUsage: (call) => {
    set((state) => ({ consensusUsage: [...state.consensusUsage, call] }));
  },

  setMajorityVote: (vote) => {
    set({ majorityVote: vote });
  },

  clearConsensus: () => {
    set({ metaAnalysis: null, majorityVote: null });
  },

  resetStreamingState: () => {
    set({
      runPrompt: null,
      consensusUsage: [],
      majorityVote: null,
      responses: [],
      embeddings: [],
      embeddingsSource: null,
      similarityMatrix: null,
      agreementStats: null,
      metaAnalysis: null,
    });
  },

  clearResponses: () => {
    set({ prompt: null, runPrompt: null, manualResponses: [] });
    get().resetStreamingState();
  },
});
