import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ModelResponse } from "~/store/slices/responseSlice";
import { useConsensusTrigger } from "../useConsensusTrigger";
import { useConsensusStatus } from "../useConsensusStatus";

function answer(
  modelId: string,
  overrides: Partial<ModelResponse> = {},
): ModelResponse {
  return {
    modelId,
    provider: "openai",
    model: modelId.toUpperCase(),
    response: `Answer from ${modelId}`,
    isStreaming: false,
    isComplete: true,
    responseTime: 10,
    tokenCount: 5,
    error: null,
    ...overrides,
  };
}

const failed = (modelId: string) =>
  answer(modelId, { response: "", error: "401", errorKind: "invalid_key" });

function trigger(
  responses: ModelResponse[],
  extra: { error?: string | null } = {},
) {
  const generateConsensus = vi.fn().mockResolvedValue(undefined);
  renderHook(() =>
    useConsensusTrigger({
      hasHydrated: true,
      responses,
      manualResponses: [],
      metaAnalysis: null,
      summarizerModel: "gpt",
      selectedModels: [],
      prompt: "Q",
      generateConsensus,
      isGenerating: false,
      error: extra.error ?? null,
    }),
  );
  return generateConsensus;
}

describe("useConsensusTrigger", () => {
  it("runs consensus over the successful answers only", () => {
    const generate = trigger([answer("a"), failed("b"), answer("c")]);
    expect(generate).toHaveBeenCalledTimes(1);
    const sent = generate.mock.calls[0]![0] as { modelId: string }[];
    expect(sent.map((r) => r.modelId)).toEqual(["a", "c"]);
  });

  it("does not run with fewer than two successful answers", () => {
    expect(trigger([answer("a"), failed("b")])).not.toHaveBeenCalled();
  });

  it("does not run again after consensus failed", () => {
    expect(
      trigger([answer("a"), answer("b")], { error: "boom" }),
    ).not.toHaveBeenCalled();
  });
});

function status(responses: ModelResponse[], manualCount = 0) {
  return renderHook(() =>
    useConsensusStatus({
      hasHydrated: true,
      responses,
      manualCount,
      metaAnalysis: null,
      isGenerating: false,
      error: null,
    }),
  ).result.current;
}

describe("useConsensusStatus", () => {
  it("hides the card when fewer than two answers succeeded", () => {
    expect(status([answer("a"), failed("b")])).toBeNull();
  });

  it("counts manual answers", () => {
    expect(status([answer("a"), failed("b")], 1)).toBe("generating");
  });

  it("awaits while answers stream", () => {
    expect(
      status([
        answer("a"),
        answer("b", { isStreaming: true, isComplete: false }),
      ]),
    ).toBe("awaiting");
  });
});
