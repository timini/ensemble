import { describe, expect, it } from "vitest";
import {
  buildEstimateInput,
  buildRunCallUsage,
  embeddingModelRef,
} from "../runCost";
import type { ModelResponse } from "~/store";

const selectedModels = [
  { id: "sel-1", provider: "openai" as const, model: "gpt-6-astra" },
  { id: "sel-2", provider: "anthropic" as const, model: "claude-opus-5-5" },
];

function response(overrides: Partial<ModelResponse>): ModelResponse {
  return {
    modelId: "sel-1",
    provider: "openai",
    model: "GPT-6 Astra",
    response: "a".repeat(40),
    isStreaming: false,
    isComplete: true,
    responseTime: 10,
    tokenCount: null,
    usage: null,
    error: null,
    ...overrides,
  };
}

describe("embeddingModelRef", () => {
  it("names the endpoint embedding model for openai-compatible", () => {
    const endpoints = [
      { id: "ollama", status: "valid" as const, embeddingModel: "nomic-embed-text" },
    ];
    expect(embeddingModelRef("openai-compatible", endpoints)).toEqual({
      provider: "openai-compatible",
      modelId: "ollama/nomic-embed-text",
    });
    expect(embeddingModelRef("openai-compatible")).toBeNull();
  });

  it("maps the embeddings provider to the model the client calls", () => {
    expect(embeddingModelRef("openai")).toEqual({
      provider: "openai",
      modelId: "text-embedding-3-small",
    });
    expect(embeddingModelRef("google")).toEqual({
      provider: "google",
      modelId: "gemini-embedding-2",
    });
    expect(embeddingModelRef(null)).toBeNull();
  });
});

describe("buildEstimateInput", () => {
  it("uses model API ids, the summarizer provider and the prompt length", () => {
    const input = buildEstimateInput({
      selectedModels,
      manualResponseCount: 1,
      consensusMethod: "council",
      summarizerModel: "claude-opus-5-5",
      eloTopN: 3,
      embeddingsProvider: "openai",
      prompt: "a".repeat(400),
    });
    expect(input).toEqual({
      models: [
        { provider: "openai", modelId: "gpt-6-astra" },
        { provider: "anthropic", modelId: "claude-opus-5-5" },
      ],
      manualResponseCount: 1,
      consensusMethod: "council",
      summarizer: { provider: "anthropic", modelId: "claude-opus-5-5" },
      eloTopN: 3,
      embeddings: { provider: "openai", modelId: "text-embedding-3-small" },
      promptTokens: 100,
    });
  });

  it("leaves the summarizer to the default when none is set or its provider is unknown", () => {
    const input = buildEstimateInput({
      selectedModels,
      manualResponseCount: 0,
      consensusMethod: "standard",
      summarizerModel: "not-a-model",
      eloTopN: 3,
      embeddingsProvider: null,
      prompt: "",
    });
    expect(input.summarizer).toBeNull();
    expect(input.embeddings).toBeNull();
  });
});

describe("buildRunCallUsage", () => {
  it("uses reported usage, estimates the rest, and adds consensus and embedding calls", () => {
    const consensusCall = {
      provider: "anthropic",
      modelId: "claude-opus-5-5",
      inputTokens: 500,
      outputTokens: 50,
      source: "reported" as const,
    };
    const calls = buildRunCallUsage({
      prompt: "p".repeat(8),
      responses: [
        response({ usage: { inputTokens: 7, outputTokens: 9 } }),
        response({ modelId: "sel-2", provider: "anthropic" }),
        response({ modelId: "sel-3", error: "boom" }),
      ],
      selectedModels,
      consensusUsage: [consensusCall],
      embeddings: [{ modelId: "sel-1" }, { modelId: "sel-2" }],
      embeddingsSource: "openai",
    });

    expect(calls).toEqual([
      {
        provider: "openai",
        modelId: "gpt-6-astra",
        inputTokens: 7,
        outputTokens: 9,
        source: "reported",
      },
      {
        provider: "anthropic",
        modelId: "claude-opus-5-5",
        inputTokens: 2,
        outputTokens: 10,
        source: "estimated",
      },
      consensusCall,
      {
        provider: "openai",
        modelId: "text-embedding-3-small",
        inputTokens: 10,
        outputTokens: 0,
        source: "estimated",
      },
      {
        provider: "openai",
        modelId: "text-embedding-3-small",
        inputTokens: 10,
        outputTokens: 0,
        source: "estimated",
      },
    ]);
  });

  it("skips embedding calls when the provider is unknown", () => {
    const calls = buildRunCallUsage({
      prompt: "",
      responses: [],
      selectedModels,
      consensusUsage: [],
      embeddings: [{ modelId: "sel-1" }],
      embeddingsSource: null,
    });
    expect(calls).toEqual([]);
  });

  it("prices the embedding of a manual answer from its text", () => {
    const calls = buildRunCallUsage({
      prompt: "",
      responses: [],
      manualResponses: [{ id: "manual-1", response: "m".repeat(40) }],
      selectedModels,
      consensusUsage: [],
      embeddings: [{ modelId: "manual-1" }],
      embeddingsSource: "openai",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.modelId).toBe("text-embedding-3-small");
    expect(calls[0]?.inputTokens).toBeGreaterThan(0);
  });
});
