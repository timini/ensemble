import { describe, expect, it, vi } from "vitest";
import {
  toAgreementProps,
  toAnswerItems,
  toConsensusStatus,
  type AgreementInput,
} from "../workspaceRun";
import type { ModelResponse } from "~/store";

const calibration = {
  levelThresholds: { high: 0.8, medium: 0.5 },
  calibration: { calibrated: false, embeddingModel: "text-embedding-3-small" },
};
const ready: AgreementInput = {
  embeddings: "ready",
  finished: true,
  total: 2,
  done: 2,
  scorable: 2,
  overall: 0.9,
  comparisons: [
    { model1: "GPT", model2: "Gemini", similarity: 0.9, confidence: 0.9 },
  ],
  excluded: [],
  calibration,
};

describe("toAgreementProps", () => {
  it("shows the score, each pair and the calibration once embeddings are ready", () => {
    expect(toAgreementProps(ready)).toEqual({
      status: "ready",
      score: 0.9,
      pairs: [{ a: "GPT", b: "Gemini", score: 0.9 }],
      thresholds: calibration.levelThresholds,
      calibration: calibration.calibration,
      excluded: [],
    });
  });

  it("is pending with progress while answers stream", () => {
    expect(
      toAgreementProps({ ...ready, finished: false, total: 3, done: 1 }),
    ).toEqual({
      status: "pending",
      progress: { done: 1, total: 3 },
    });
  });

  it("is pending while the embeddings are computed", () => {
    expect(toAgreementProps({ ...ready, embeddings: "pending" }).status).toBe(
      "pending",
    );
  });

  it("explains that no embedding provider is available, with settings and the pull command", () => {
    const onOpenSettings = vi.fn();
    expect(
      toAgreementProps({
        ...ready,
        embeddings: "unavailable",
        pullCommand: "ollama pull nomic-embed-text",
        onOpenSettings,
      }),
    ).toEqual({
      status: "unavailable",
      reason: "noEmbeddings",
      command: "ollama pull nomic-embed-text",
      onOpenSettings,
    });
  });

  it("says when embeddings failed", () => {
    expect(toAgreementProps({ ...ready, embeddings: "error" })).toEqual({
      status: "unavailable",
      reason: "error",
    });
  });

  it("says the answers could not be compared when ready with no pairs", () => {
    expect(toAgreementProps({ ...ready, comparisons: [] })).toEqual({
      status: "unavailable",
      reason: "error",
    });
  });

  it("needs two answers to compare", () => {
    expect(toAgreementProps({ ...ready, scorable: 1 })).toEqual({
      status: "unavailable",
      reason: "tooFewAnswers",
    });
  });

  it("names the answers left out of the score", () => {
    expect(toAgreementProps({ ...ready, excluded: ["Claude"] })).toMatchObject({
      excluded: ["Claude"],
    });
  });
});

describe("toConsensusStatus", () => {
  it("keeps the consensus status and calls a run with too few answers unavailable", () => {
    expect(toConsensusStatus("success")).toBe("success");
    expect(toConsensusStatus(null)).toBe("unavailable");
  });

  it("says a reopened run with enough answers kept no consensus", () => {
    expect(toConsensusStatus(null, { readOnly: true, answers: 2 })).toBe(
      "notSaved",
    );
    expect(toConsensusStatus(null, { readOnly: true, answers: 1 })).toBe(
      "unavailable",
    );
    expect(toConsensusStatus("success", { readOnly: true, answers: 2 })).toBe(
      "success",
    );
  });
});

const response = (over: Partial<ModelResponse>): ModelResponse => ({
  modelId: "s1",
  provider: "openai",
  model: "GPT-6 Astra",
  response: "42",
  isStreaming: false,
  isComplete: true,
  responseTime: 1200,
  tokenCount: null,
  error: null,
  ...over,
});

describe("toAnswerItems", () => {
  const runModels = [
    { id: "s1", provider: "openai" as const, model: "gpt-6-astra" },
    {
      id: "s2",
      provider: "openai-compatible" as const,
      model: "ollama/llama3.2:3b",
    },
  ];

  it("lists the run's models in order, waiting until their stream starts, then manual answers", () => {
    const items = toAnswerItems({
      responses: [response({})],
      manualResponses: [
        { id: "manual-1", label: "Textbook", response: "Forty-two" },
      ],
      runModels,
      endpoints: [{ id: "ollama", label: "Ollama" }],
    });
    expect(items.map((i) => [i.id, i.status, i.modelName])).toEqual([
      ["gpt-6-astra", "complete", "GPT-6 Astra"],
      ["ollama/llama3.2:3b", "waiting", "llama3.2:3b"],
      ["manual-1", "complete", "Textbook"],
    ]);
    expect(items[0]).toMatchObject({ content: "42", durationMs: 1200 });
    expect(items[1]).toMatchObject({ providerLabel: "Ollama" });
    expect(items[2]).toMatchObject({ kind: "manual" });
  });

  it("shows a stream with text as streaming and one with none yet as waiting", () => {
    const [first] = toAnswerItems({
      responses: [
        response({ isStreaming: true, isComplete: false, response: "" }),
      ],
      manualResponses: [],
      runModels: runModels.slice(0, 1),
      endpoints: [],
    });
    expect(first?.status).toBe("waiting");
    const [second] = toAnswerItems({
      responses: [
        response({ isStreaming: true, isComplete: false, response: "4" }),
      ],
      manualResponses: [],
      runModels: runModels.slice(0, 1),
      endpoints: [],
    });
    expect(second?.status).toBe("streaming");
  });

  it("carries the error kind and retries that model by its selection id", () => {
    const onRetry = vi.fn();
    const [item] = toAnswerItems({
      responses: [
        response({
          error: "Rate limited",
          errorKind: "rate_limited",
          retryAfterSeconds: 30,
        }),
      ],
      manualResponses: [],
      runModels: runModels.slice(0, 1),
      endpoints: [],
      onRetry,
    });
    expect(item).toMatchObject({
      status: "error",
      errorKind: "rate_limited",
      retryAfterSeconds: 30,
      error: "Rate limited",
    });
    item?.onRetry?.();
    expect(onRetry).toHaveBeenCalledWith("s1");
  });

  it("still lists answers of a run stored before its models were recorded", () => {
    const items = toAnswerItems({
      responses: [response({ modelId: "old" })],
      manualResponses: [],
      runModels: [],
      endpoints: [],
    });
    expect(items.map((i) => i.id)).toEqual(["old"]);
  });
});
