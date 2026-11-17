import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ManualResponse, ModelResponse } from "~/store";
import { useReviewAnalytics } from "../useReviewAnalytics";

const answer = (
  modelId: string,
  overrides: Partial<ModelResponse> = {},
): ModelResponse => ({
  modelId,
  provider: "openai",
  model: `Model ${modelId}`,
  response: `answer ${modelId}`,
  isStreaming: false,
  isComplete: true,
  responseTime: 1,
  tokenCount: null,
  error: null,
  ...overrides,
});

const manual: ManualResponse = {
  id: "manual-1",
  label: "Textbook (Library)",
  response: "Forty-two.",
};

describe("useReviewAnalytics", () => {
  it("scores manual answers with the completed model answers", () => {
    const responses = [
      answer("a"),
      answer("b"),
      answer("c", { error: "boom", errorKind: "other" }),
    ];
    const embeddings = [
      { modelId: "a", embedding: [1, 0] },
      { modelId: "b", embedding: [0, 1] },
      { modelId: "manual-1", embedding: [1, 1] },
    ];
    const matrix = [
      [1, 0, 0.7],
      [0, 1, 0.7],
      [0.7, 0.7, 1],
    ];

    const { result } = renderHook(() =>
      useReviewAnalytics(responses, [manual], null, matrix, embeddings),
    );

    expect(result.current.completedResponses.map((r) => r.modelId)).toEqual([
      "a",
      "b",
    ]);
    expect(result.current.agreementAnswers.map((r) => r.modelId)).toEqual([
      "a",
      "b",
      "manual-1",
    ]);
    expect(result.current.pairwiseComparisons).toHaveLength(3);
    expect(result.current.pairwiseComparisons.map((c) => c.model2)).toContain(
      "Textbook (Library)",
    );
  });

  it("leaves out manual answers with no text", () => {
    const { result } = renderHook(() =>
      useReviewAnalytics(
        [answer("a")],
        [{ ...manual, response: "  " }],
        null,
        null,
        [],
      ),
    );

    expect(result.current.agreementAnswers.map((r) => r.modelId)).toEqual([
      "a",
    ]);
  });
});
