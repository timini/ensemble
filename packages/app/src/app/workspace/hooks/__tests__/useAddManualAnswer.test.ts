import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
import {
  useAddManualAnswer,
  useRemoveManualAnswer,
} from "../useAddManualAnswer";

describe("useAddManualAnswer", () => {
  beforeEach(() => {
    useStore.setState({
      manualResponses: [],
      metaAnalysis: "old consensus",
      majorityVote: null,
    });
  });

  it("adds the answer and makes the consensus run again", () => {
    const restartConsensus = vi.fn();
    const { result } = renderHook(() => useAddManualAnswer(restartConsensus));

    act(() => result.current("Textbook (Library)", "Forty-two."));

    const state = useStore.getState();
    expect(state.manualResponses).toHaveLength(1);
    expect(state.manualResponses[0]).toMatchObject({
      label: "Textbook (Library)",
      response: "Forty-two.",
    });
    expect(state.metaAnalysis).toBeNull();
    expect(restartConsensus).toHaveBeenCalledTimes(1);
  });
});

describe("useRemoveManualAnswer", () => {
  beforeEach(() => {
    useStore.setState({
      manualResponses: [{ id: "m1", label: "Me", response: "Forty-two." }],
      embeddings: [
        { modelId: "a", embedding: [1, 0] },
        { modelId: "b", embedding: [0.8, 0.6] },
        { modelId: "m1", embedding: [0, 1] },
      ],
      embeddingsSource: "openai",
      similarityMatrix: [
        [1, 0.8, 0],
        [0.8, 1, 0.6],
        [0, 0.6, 1],
      ],
      agreementStats: {
        mean: 0.47,
        median: 0.6,
        min: 0,
        max: 0.8,
        stddev: 0.33,
      },
      metaAnalysis: "consensus with the manual answer",
      majorityVote: null,
    });
  });

  it("drops the answer's embedding, scores agreement again and makes the consensus run again", () => {
    const restartConsensus = vi.fn();
    const { result } = renderHook(() =>
      useRemoveManualAnswer(restartConsensus),
    );

    act(() => result.current("m1"));

    const state = useStore.getState();
    expect(state.manualResponses).toEqual([]);
    expect(state.embeddings.map((e) => e.modelId)).toEqual(["a", "b"]);
    expect(state.embeddingsSource).toBe("openai");
    expect(state.similarityMatrix).toHaveLength(2);
    expect(state.agreementStats?.mean).toBeCloseTo(0.8);
    expect(state.metaAnalysis).toBeNull();
    expect(restartConsensus).toHaveBeenCalledTimes(1);
  });
});
