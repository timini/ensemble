import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "~/store";
import { useRunEstimates } from "../useRunEstimates";

describe("useRunEstimates", () => {
  beforeEach(() => {
    useStore.setState({
      selectedModels: [
        { id: "a", provider: "openai", model: "gpt-6-astra" },
        { id: "b", provider: "openai", model: "gpt-6-luna" },
      ],
      manualResponses: [],
      summarizerModel: null,
      embeddingsProvider: "auto",
      endpoints: [],
      apiKeys: {
        ...useStore.getState().apiKeys,
        openai: { key: "sk-test", status: "valid" },
      },
    } as never);
  });

  it("estimates every consensus method for the current ensemble", () => {
    const { result } = renderHook(() => useRunEstimates("What is 6 times 7?"));
    // 2 answers, 1 synthesis call and 2 embedding calls.
    expect(result.current.standard.calls.total).toBe(5);
    expect(result.current.standard.consensusAvailable).toBe(true);
    // ELO and council need 3 answers.
    expect(result.current.elo.consensusAvailable).toBe(false);
    expect(result.current.council.consensusAvailable).toBe(false);
    expect(result.current.majority.consensusAvailable).toBe(true);
  });

  it("plans no embedding calls without an embeddings provider", () => {
    useStore.setState({
      apiKeys: { ...useStore.getState().apiKeys, openai: null },
    } as never);
    const { result } = renderHook(() => useRunEstimates("Q"));
    expect(result.current.standard.calls.total).toBe(3);
  });
});
