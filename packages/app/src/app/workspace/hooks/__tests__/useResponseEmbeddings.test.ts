import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelResponse } from "~/store";

const generateEmbeddingsForResponses = vi.fn();
vi.mock("~/lib/embeddings", () => ({
  generateEmbeddingsForResponses: (...args: unknown[]) =>
    generateEmbeddingsForResponses(...args) as unknown,
}));

import { useResponseEmbeddings } from "../useResponseEmbeddings";

const response = (modelId: string): ModelResponse => ({
  modelId,
  provider: "openai",
  model: modelId,
  response: `answer from ${modelId}`,
  isStreaming: false,
  isComplete: true,
  responseTime: 1,
  tokenCount: null,
  error: null,
});

const completed = [response("a"), response("b")];
// Stable reference, as the store would give.
const noEmbeddings: { modelId: string; embedding: number[] }[] = [];

type Embedding = { modelId: string; embedding: number[] };

interface SetupOptions {
  responses?: ModelResponse[];
  embeddings?: Embedding[];
  embeddingsSource?: string | null;
  similarityMatrix?: number[][] | null;
  readOnly?: boolean;
}

function setup(
  embeddingsProvider: "openai" | "google" | null,
  {
    responses = completed,
    embeddings = noEmbeddings,
    embeddingsSource = null,
    similarityMatrix = null,
    readOnly = false,
  }: SetupOptions = {},
) {
  const setEmbeddings = vi.fn();
  const calculateAgreementState = vi.fn();
  const hook = renderHook(() =>
    useResponseEmbeddings({
      hasHydrated: true,
      completedResponses: responses,
      embeddingsProvider,
      viewEmbeddings: embeddings,
      viewEmbeddingsSource: embeddingsSource,
      viewSimilarityMatrix: similarityMatrix,
      mode: "free",
      setEmbeddings,
      calculateAgreementState,
      readOnly,
    }),
  );
  return { hook, setEmbeddings, calculateAgreementState };
}

describe("useResponseEmbeddings", () => {
  beforeEach(() => {
    generateEmbeddingsForResponses.mockReset();
  });

  it("does nothing when no embedding provider is available", () => {
    const { hook } = setup(null);
    expect(generateEmbeddingsForResponses).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe("unavailable");
  });

  it("generates embeddings with the resolved provider and scores agreement", async () => {
    generateEmbeddingsForResponses.mockResolvedValue([
      { modelId: "a", embedding: [1, 0] },
      { modelId: "b", embedding: [0, 1] },
    ]);
    const { hook, setEmbeddings, calculateAgreementState } = setup("google");

    await waitFor(() => expect(calculateAgreementState).toHaveBeenCalled());
    expect(generateEmbeddingsForResponses).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", mode: "free" }),
    );
    expect(setEmbeddings).toHaveBeenCalledTimes(1);
    expect(setEmbeddings).toHaveBeenCalledWith(expect.any(Array), "google");
    expect(hook.result.current.status).toBe("ready");
  });

  it("reports an error when embeddings cannot be generated", async () => {
    generateEmbeddingsForResponses.mockRejectedValue(new Error("network down"));
    const { hook, calculateAgreementState } = setup("openai");

    await waitFor(() => expect(hook.result.current.status).toBe("error"));
    expect(calculateAgreementState).not.toHaveBeenCalled();
  });

  it("reports an error when fewer than two answers could be embedded", async () => {
    generateEmbeddingsForResponses.mockImplementation(
      ({ onError }: { onError: (id: string, e: Error) => void }) => {
        onError("b", new Error("rate limited"));
        return Promise.resolve([{ modelId: "a", embedding: [1, 0] }]);
      },
    );
    const { hook } = setup("openai");

    await waitFor(() => expect(hook.result.current.status).toBe("error"));
  });

  it("reuses persisted embeddings from the same provider on a fresh mount", async () => {
    const persisted = [
      { modelId: "a", embedding: [1, 0] },
      { modelId: "b", embedding: [0, 1] },
    ];
    const { hook, calculateAgreementState } = setup("openai", {
      embeddings: persisted,
      embeddingsSource: "openai",
      similarityMatrix: [
        [1, 0],
        [0, 1],
      ],
    });

    await waitFor(() => expect(hook.result.current.status).toBe("ready"));
    expect(generateEmbeddingsForResponses).not.toHaveBeenCalled();
    expect(calculateAgreementState).not.toHaveBeenCalled();
  });

  it("embeds again when persisted embeddings came from another provider", async () => {
    generateEmbeddingsForResponses.mockResolvedValue([
      { modelId: "a", embedding: [1, 0] },
      { modelId: "b", embedding: [0, 1] },
    ]);
    const { calculateAgreementState } = setup("google", {
      embeddings: [
        { modelId: "a", embedding: [1, 0, 0] },
        { modelId: "b", embedding: [0, 1, 0] },
      ],
      embeddingsSource: "openai",
    });

    await waitFor(() => expect(calculateAgreementState).toHaveBeenCalled());
    expect(generateEmbeddingsForResponses).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", existingEmbeddings: [] }),
    );
  });

  it("reports the answers whose embeddings failed when others succeeded", async () => {
    generateEmbeddingsForResponses.mockImplementation(
      ({ onError }: { onError: (id: string, e: Error) => void }) => {
        onError("b", new Error("rate limited"));
        return Promise.resolve([
          { modelId: "a", embedding: [1, 0] },
          { modelId: "c", embedding: [0, 1] },
        ]);
      },
    );
    const three = [response("a"), response("b"), response("c")];
    const { hook } = setup("openai", { responses: three });

    await waitFor(() => expect(hook.result.current.status).toBe("ready"));
    expect(hook.result.current.failedModelIds).toEqual(["b"]);
    // The test passes the store's embeddings unchanged, so "b" has none.
    expect(hook.result.current.excludedModels).toEqual(["b"]);
  });

  describe("for a run reopened from history", () => {
    const stored = [
      { modelId: "a", embedding: [1, 0] },
      { modelId: "b", embedding: [0, 1] },
    ];

    it("uses the stored embeddings and requests none, even from another provider", () => {
      const { hook } = setup("google", {
        embeddings: stored,
        embeddingsSource: "openai",
        similarityMatrix: [
          [1, 0],
          [0, 1],
        ],
        readOnly: true,
      });
      expect(generateEmbeddingsForResponses).not.toHaveBeenCalled();
      expect(hook.result.current.status).toBe("ready");
    });

    it("is unavailable when the run kept no embeddings", () => {
      const { hook } = setup("openai", { readOnly: true });
      expect(generateEmbeddingsForResponses).not.toHaveBeenCalled();
      expect(hook.result.current.status).toBe("unavailable");
    });
  });
});
