/**
 * Response Slice Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  createResponseSlice,
  type ResponseSlice,
} from "../slices/responseSlice";
import { markInterruptedStreams } from "../slices/responseErrorState";

describe("responseSlice", () => {
  let store: StoreApi<ResponseSlice>;

  beforeEach(() => {
    store = createStore<ResponseSlice>()(createResponseSlice);
  });

  it("initializes with empty state", () => {
    const state = store.getState();
    expect(state.prompt).toBeNull();
    expect(state.responses).toEqual([]);
    expect(state.manualResponses).toEqual([]);
    expect(state.embeddings).toEqual([]);
    expect(state.similarityMatrix).toBeNull();
    expect(state.agreementStats).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it("sets prompt", () => {
    store.getState().setPrompt("Test prompt");
    expect(store.getState().prompt).toBe("Test prompt");
  });

  it("starts streaming for a model", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    const responses = store.getState().responses;

    expect(responses).toHaveLength(1);
    expect(responses[0]?.modelId).toBe("model-1");
    expect(responses[0]?.isStreaming).toBe(true);
    expect(responses[0]?.isComplete).toBe(false);
    expect(responses[0]?.response).toBe("");
  });

  it("appends stream chunks", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().appendStreamChunk("model-1", "Hello ");
    store.getState().appendStreamChunk("model-1", "World");

    const response = store.getState().responses[0];
    expect(response?.response).toBe("Hello World");
  });

  it("completes response with token count", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().appendStreamChunk("model-1", "Test response");
    store.getState().completeResponse("model-1", 5000, 150);

    const response = store.getState().responses[0];
    expect(response?.isStreaming).toBe(false);
    expect(response?.isComplete).toBe(true);
    expect(response?.responseTime).toBe(5000);
    expect(response?.tokenCount).toBe(150);
  });

  it("stores the input and output tokens reported for a response", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store
      .getState()
      .completeResponse("model-1", 5000, 150, {
        inputTokens: 50,
        outputTokens: 100,
      });

    expect(store.getState().responses[0]?.usage).toEqual({
      inputTokens: 50,
      outputTokens: 100,
    });
  });

  it("keeps usage null when the provider reports none", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().completeResponse("model-1", 5000);

    expect(store.getState().responses[0]?.usage).toBeNull();
  });

  it("keeps consensus call usage until the run is reset", () => {
    const call = {
      provider: "openai",
      modelId: "gpt-4o",
      inputTokens: 10,
      outputTokens: 5,
      source: "reported" as const,
    };
    store.getState().addConsensusUsage(call);
    store.getState().addConsensusUsage(call);
    expect(store.getState().consensusUsage).toHaveLength(2);

    store.getState().resetStreamingState();
    expect(store.getState().consensusUsage).toEqual([]);
  });

  it("sets error for a model", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().setError("model-1", "Rate limit exceeded");

    const response = store.getState().responses[0];
    expect(response?.error).toBe("Rate limit exceeded");
    expect(response?.isStreaming).toBe(false);
    expect(response?.isComplete).toBe(true);
  });

  it("handles multiple models streaming", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store
      .getState()
      .startStreaming("model-2", "anthropic", "claude-3-5-sonnet");

    store.getState().appendStreamChunk("model-1", "Response 1");
    store.getState().appendStreamChunk("model-2", "Response 2");

    const responses = store.getState().responses;
    expect(responses).toHaveLength(2);
    expect(responses[0]?.response).toBe("Response 1");
    expect(responses[1]?.response).toBe("Response 2");
  });

  it("adds manual response", () => {
    store.getState().addManualResponse("User Response", "This is manual input");

    const manualResponses = store.getState().manualResponses;
    expect(manualResponses).toHaveLength(1);
    expect(manualResponses[0]?.label).toBe("User Response");
    expect(manualResponses[0]?.response).toBe("This is manual input");
    expect(manualResponses[0]?.id).toBeTruthy();
  });

  it("removes manual response", () => {
    store.getState().addManualResponse("Test", "Response");
    const id = store.getState().manualResponses[0]!.id;

    store.getState().removeManualResponse(id);
    expect(store.getState().manualResponses).toHaveLength(0);
  });

  it("sets embeddings", () => {
    const embeddings = [
      {
        modelId: "model-1",
        embedding: Array.from({ length: 1536 }, () => 0.5),
      },
      {
        modelId: "model-2",
        embedding: Array.from({ length: 1536 }, () => 0.6),
      },
    ];

    store.getState().setEmbeddings(embeddings);
    expect(store.getState().embeddings).toHaveLength(2);
    expect(store.getState().embeddingsSource).toBeNull();
  });

  it("records which provider produced the embeddings", () => {
    store
      .getState()
      .setEmbeddings([{ modelId: "a", embedding: [1, 0] }], "google");
    expect(store.getState().embeddingsSource).toBe("google");

    store.getState().resetStreamingState();
    expect(store.getState().embeddingsSource).toBeNull();
  });

  it("calculates agreement with no embeddings", () => {
    store.getState().calculateAgreement();
    expect(store.getState().similarityMatrix).toBeNull();
    expect(store.getState().agreementStats).toBeNull();
  });

  it("calculates agreement with embeddings", () => {
    const embeddings = [
      {
        modelId: "model-1",
        embedding: Array.from({ length: 1536 }, () => 0.5),
      },
      {
        modelId: "model-2",
        embedding: Array.from({ length: 1536 }, () => 0.6),
      },
      {
        modelId: "model-3",
        embedding: Array.from({ length: 1536 }, () => 0.7),
      },
    ];

    store.getState().setEmbeddings(embeddings);
    store.getState().calculateAgreement();

    const state = store.getState();
    expect(state.similarityMatrix).toBeTruthy();
    expect(state.similarityMatrix).toHaveLength(3);
    expect(state.agreementStats).toBeTruthy();
    expect(state.agreementStats?.mean).toBeGreaterThan(0);
    expect(state.agreementStats?.median).toBeGreaterThan(0);
  });

  it("computes stats over the upper triangle only", () => {
    store.getState().setEmbeddings([
      { modelId: "a", embedding: [1, 0] },
      { modelId: "b", embedding: [1, 0] },
      { modelId: "c", embedding: [0, 1] },
    ]);
    store.getState().calculateAgreement();

    const { similarityMatrix, agreementStats } = store.getState();
    expect(similarityMatrix?.[0]?.[1]).toBeCloseTo(1, 10);
    expect(similarityMatrix?.[0]?.[2]).toBeCloseTo(0, 10);
    expect(agreementStats?.mean).toBeCloseTo(1 / 3, 10);
    expect(agreementStats?.min).toBeCloseTo(0, 10);
    expect(agreementStats?.max).toBeCloseTo(1, 10);
  });

  it("clears agreement when embedding lengths differ", () => {
    store.getState().setEmbeddings([
      { modelId: "a", embedding: [1, 0, 0] },
      { modelId: "b", embedding: [1, 0] },
    ]);
    store.getState().calculateAgreement();
    expect(store.getState().similarityMatrix).toBeNull();
    expect(store.getState().agreementStats).toBeNull();
  });

  it("clears agreement when an embedding is a zero vector", () => {
    store.getState().setEmbeddings([
      { modelId: "a", embedding: [0, 0] },
      { modelId: "b", embedding: [1, 0] },
    ]);
    store.getState().calculateAgreement();
    expect(store.getState().similarityMatrix).toBeNull();
    expect(store.getState().agreementStats).toBeNull();
  });

  it("sets meta-analysis", () => {
    store.getState().setMetaAnalysis("This is the meta-analysis");
    expect(store.getState().metaAnalysis).toBe("This is the meta-analysis");
  });

  it("clears all responses", () => {
    store.getState().setPrompt("Test prompt");
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().addManualResponse("Test", "Response");
    store.getState().setMetaAnalysis("Analysis");

    store.getState().clearResponses();

    const state = store.getState();
    expect(state.prompt).toBeNull();
    expect(state.responses).toEqual([]);
    expect(state.manualResponses).toEqual([]);
    expect(state.embeddings).toEqual([]);
    expect(state.similarityMatrix).toBeNull();
    expect(state.agreementStats).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it("resets streaming state without clearing prompt", () => {
    store.getState().setPrompt("Persisted prompt");
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().addManualResponse("Manual", "Response");
    store.getState().setMetaAnalysis("Meta");

    store.getState().resetStreamingState();

    const state = store.getState();
    expect(state.prompt).toBe("Persisted prompt");
    expect(state.responses).toEqual([]);
    expect(state.manualResponses).toHaveLength(1);
    expect(state.embeddings).toEqual([]);
    expect(state.similarityMatrix).toBeNull();
    expect(state.agreementStats).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it("restarts streaming for same model", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().appendStreamChunk("model-1", "First attempt");
    store.getState().setError("model-1", "Error occurred");

    // Restart streaming
    store.getState().startStreaming("model-1", "openai", "gpt-4o");

    const response = store.getState().responses[0];
    expect(response?.isStreaming).toBe(true);
    expect(response?.isComplete).toBe(false);
    expect(response?.error).toBeNull();
    expect(store.getState().responses).toHaveLength(1);
  });

  it("clears the old text and error details when a model restarts", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().appendStreamChunk("model-1", "Partial");
    store.getState().setError("model-1", "429", {
      kind: "rate_limited",
      retryAfterSeconds: 30,
    });

    store.getState().startStreaming("model-1", "openai", "gpt-4o");

    const response = store.getState().responses[0];
    expect(response?.response).toBe("");
    expect(response?.errorKind).toBeNull();
    expect(response?.retryAfterSeconds).toBeNull();
  });

  it("stores the error kind and retry delay", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().setError("model-1", "429 Too many", {
      kind: "rate_limited",
      retryAfterSeconds: 12,
    });

    const response = store.getState().responses[0];
    expect(response?.errorKind).toBe("rate_limited");
    expect(response?.retryAfterSeconds).toBe(12);
  });

  it("defaults the error kind to other", () => {
    store.getState().startStreaming("model-1", "openai", "gpt-4o");
    store.getState().setError("model-1", "boom");
    expect(store.getState().responses[0]?.errorKind).toBe("other");
  });

  it("clears the consensus but keeps its billed usage", () => {
    store.getState().setMetaAnalysis("Consensus");
    store.getState().addConsensusUsage({
      provider: "openai",
      modelId: "gpt-4o",
      inputTokens: 1,
      outputTokens: 1,
      source: "reported",
    });
    store.getState().clearConsensus();

    expect(store.getState().metaAnalysis).toBeNull();
    expect(store.getState().majorityVote).toBeNull();
    expect(store.getState().consensusUsage).toHaveLength(1);
  });
});

describe("runPrompt", () => {
  it("keeps the prompt a run was made with apart from the draft", () => {
    const store = createStore<ResponseSlice>()(createResponseSlice);
    store.getState().setPrompt("First question");
    store.getState().startRun("First question");
    store.getState().setPrompt("Draft of the next question");

    expect(store.getState().runPrompt).toBe("First question");
    expect(store.getState().prompt).toBe("Draft of the next question");
  });

  it("clears the previous results when a run starts", () => {
    const store = createStore<ResponseSlice>()(createResponseSlice);
    store.getState().startStreaming("m", "openai", "M");
    store.getState().setMetaAnalysis("Old consensus");
    store.getState().startRun("New question");

    expect(store.getState().responses).toEqual([]);
    expect(store.getState().metaAnalysis).toBeNull();
    expect(store.getState().runPrompt).toBe("New question");
  });

  it("is cleared with the responses", () => {
    const store = createStore<ResponseSlice>()(createResponseSlice);
    store.getState().startRun("Q");
    store.getState().clearResponses();
    expect(store.getState().runPrompt).toBeNull();
  });
});

describe("markInterruptedStreams", () => {
  it("turns answers that were streaming when the page unloaded into interrupted errors", () => {
    const stored = {
      prompt: "Q",
      responses: [
        {
          modelId: "a",
          provider: "openai" as const,
          model: "A",
          response: "Half an ans",
          isStreaming: true,
          isComplete: false,
          responseTime: null,
          tokenCount: null,
          error: null,
        },
        {
          modelId: "b",
          provider: "openai" as const,
          model: "B",
          response: "Done",
          isStreaming: false,
          isComplete: true,
          responseTime: 10,
          tokenCount: 5,
          error: null,
        },
      ],
    };

    const result = markInterruptedStreams(stored);

    expect(result.prompt).toBe("Q");
    expect(result.responses?.[0]).toMatchObject({
      isStreaming: false,
      isComplete: true,
      errorKind: "interrupted",
    });
    expect(result.responses?.[0]?.error).toBeTruthy();
    expect(result.responses?.[1]).toEqual(stored.responses[1]);
  });

  it("leaves state without responses alone", () => {
    const stored: { theme: string; responses?: undefined } = { theme: "dark" };
    expect(markInterruptedStreams(stored)).toEqual(stored);
  });
});
