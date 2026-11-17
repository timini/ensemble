import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "~/store";
import { useNewQuestion } from "../useNewQuestion";

const manual = { id: "manual-1", label: "My notes", response: "Forty-two." };

describe("useNewQuestion", () => {
  beforeEach(() => {
    useStore.setState({
      prompt: "First question",
      runPrompt: "First question",
      manualResponses: [manual],
      metaAnalysis: "consensus",
    });
  });

  it("clears the run and the manual answers written for its prompt", () => {
    const { result } = renderHook(() => useNewQuestion());

    act(() => result.current());

    const state = useStore.getState();
    expect(state.manualResponses).toEqual([]);
    expect(state.runPrompt).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it("empties the composer for the next question", () => {
    const { result } = renderHook(() => useNewQuestion());

    act(() => result.current());

    expect(useStore.getState().prompt).toBe("");
  });

  it("keeps the ensemble", () => {
    const models = [
      { id: "a", provider: "openai" as const, model: "gpt-6-astra" },
    ];
    useStore.setState({ selectedModels: models });
    const { result } = renderHook(() => useNewQuestion());

    act(() => result.current());

    expect(useStore.getState().selectedModels).toEqual(models);
  });
});
