import { describe, expect, it } from "vitest";
import {
  restoredRunState,
  runRecordExtras,
  runRecordId,
  toStoredRun,
} from "../runHistoryRecord";
import type { ModelResponse } from "~/store/slices/responseTypes";

const answer = (overrides: Partial<ModelResponse> = {}): ModelResponse => ({
  modelId: "a",
  provider: "openai",
  model: "gpt-6-astra",
  response: "42",
  isStreaming: false,
  isComplete: true,
  responseTime: 900,
  tokenCount: 3,
  error: null,
  ...overrides,
});

const state = {
  runPrompt: "What is 6 times 7?",
  prompt: "What is 6 times 7?",
  runModels: [{ id: "a", provider: "openai" as const, model: "gpt-6-astra" }],
  selectedModels: [],
  runStartedAt: 5_000,
  responses: [answer()],
  manualResponses: [{ id: "m1", label: "Me", response: "42" }],
  embeddings: [{ modelId: "a", embedding: [1, 0] }],
  embeddingsSource: "openai",
  similarityMatrix: [[1]],
  agreementStats: null,
  metaAnalysis: "Both say 42.",
  majorityVote: null,
  consensusUsage: [],
  consensusMethod: "majority" as const,
  summarizerModel: "gpt-6-astra",
  historyView: null,
};

const extras = {
  agreementScore: 0.91,
  agreementLevel: "high" as const,
  costUsd: 0.002,
};

describe("toStoredRun", () => {
  it("records the finished run with its answers, agreement, consensus and cost", () => {
    const run = toStoredRun(state, extras);
    expect(run).toMatchObject({
      id: runRecordId(5_000),
      createdAt: 5_000,
      prompt: "What is 6 times 7?",
      consensusMethod: "majority",
      summarizerModel: "gpt-6-astra",
      metaAnalysis: "Both say 42.",
      agreementScore: 0.91,
      agreementLevel: "high",
      costUsd: 0.002,
    });
    expect(run!.responses).toHaveLength(1);
    expect(run!.manualResponses).toHaveLength(1);
    expect(run!.embeddings).toEqual([{ modelId: "a", embedding: [1, 0] }]);
  });

  it("records nothing while an answer streams", () => {
    expect(
      toStoredRun(
        {
          ...state,
          responses: [answer({ isStreaming: true, isComplete: false })],
        },
        extras,
      ),
    ).toBeNull();
  });

  it("records nothing with no run, no start time or no answers", () => {
    expect(
      toStoredRun({ ...state, runPrompt: null, responses: [] }, extras),
    ).toBeNull();
    expect(toStoredRun({ ...state, runStartedAt: null }, extras)).toBeNull();
    expect(
      toStoredRun({ ...state, responses: [], manualResponses: [] }, extras),
    ).toBeNull();
  });

  it("does not record a run reopened from history again", () => {
    const historyView = {
      id: "run-5000",
      consensusMethod: "standard" as const,
      summarizerModel: null,
    };
    expect(toStoredRun({ ...state, historyView }, extras)).toBeNull();
  });
});

describe("restoredRunState", () => {
  it("puts a stored run back on screen as a read-only history view", () => {
    const stored = toStoredRun(state, extras)!;
    const restored = restoredRunState(stored);
    expect(restored).toMatchObject({
      runPrompt: "What is 6 times 7?",
      prompt: "What is 6 times 7?",
      runStartedAt: 5_000,
      metaAnalysis: "Both say 42.",
      embeddingsSource: "openai",
      historyView: {
        id: stored.id,
        consensusMethod: "majority",
        summarizerModel: "gpt-6-astra",
      },
    });
    expect(restored.runModels).toEqual(state.runModels);
    expect(restored.responses).toEqual(state.responses);
  });
});

describe("runRecordExtras", () => {
  it("takes the score, its level and the total cost", () => {
    expect(
      runRecordExtras({ status: "ready", score: 0.95 }, { totalUsd: 0.003 }),
    ).toEqual({
      agreementScore: 0.95,
      agreementLevel: "high",
      costUsd: 0.003,
    });
  });

  it("leaves out what is not known yet", () => {
    expect(runRecordExtras({ status: "pending" }, undefined)).toEqual({
      agreementScore: null,
      agreementLevel: null,
      costUsd: null,
    });
  });
});
