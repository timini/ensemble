import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
import { useAddManualAnswer } from "../useAddManualAnswer";

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
