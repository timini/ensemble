import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { useStore } from "~/store";
import { useReviewNavigation } from "../useReviewNavigation";

const manual = { id: "manual-1", label: "My notes", response: "Forty-two." };

describe("useReviewNavigation", () => {
  beforeEach(() => {
    push.mockClear();
    useStore.setState({
      prompt: "First question",
      runPrompt: "First question",
      manualResponses: [manual],
      metaAnalysis: "consensus",
    });
  });

  it("keeps the run and its manual answers when going back to the prompt", () => {
    const { result } = renderHook(() => useReviewNavigation());

    act(() => result.current.handleBack());

    expect(useStore.getState().manualResponses).toEqual([manual]);
    expect(push).toHaveBeenCalledWith("/prompt");
  });

  it("drops the manual answers of the old prompt on New comparison", () => {
    const { result } = renderHook(() => useReviewNavigation());

    act(() => result.current.handleNewComparison());

    const state = useStore.getState();
    expect(state.manualResponses).toEqual([]);
    expect(state.runPrompt).toBeNull();
    expect(state.prompt).toBe("First question");
    expect(push).toHaveBeenCalledWith("/prompt");
  });

  it("drops the manual answers on Start over", () => {
    const { result } = renderHook(() => useReviewNavigation());

    act(() => result.current.handleStartOver());

    expect(useStore.getState().manualResponses).toEqual([]);
    expect(push).toHaveBeenCalledWith("/config");
  });
});
