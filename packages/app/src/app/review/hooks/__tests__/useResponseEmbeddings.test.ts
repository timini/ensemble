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

function setup(embeddingsProvider: "openai" | "google" | null) {
  const setEmbeddings = vi.fn();
  const calculateAgreementState = vi.fn();
  const hook = renderHook(() =>
    useResponseEmbeddings({
      hasHydrated: true,
      completedResponses: completed,
      embeddingsProvider,
      viewEmbeddings: noEmbeddings,
      viewSimilarityMatrix: null,
      mode: "free",
      setEmbeddings,
      calculateAgreementState,
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
});
