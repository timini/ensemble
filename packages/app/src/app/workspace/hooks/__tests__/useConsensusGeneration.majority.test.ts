import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "@ensemble-ai/shared-utils/providers";
import { useStore } from "~/store";

// Majority consensus: the extraction call returns 42, 42 and 41.
const streamResponse = vi.fn();
const fakeProvider = {
  generateStructured: vi.fn(async () => {
    const parsed = {
      answers: [
        { id: "R1", kind: "number", answer: "42" },
        { id: "R2", kind: "number", answer: "42.0" },
        { id: "R3", kind: "number", answer: "41" },
      ],
    };
    return {
      parsed,
      raw: JSON.stringify(parsed),
      responseTimeMs: 1,
      usage: { inputTokens: 300, outputTokens: 30 },
    };
  }),
  streamResponse,
} as unknown as AIProvider;

vi.mock("@ensemble-ai/shared-utils/providers", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    ProviderRegistry: {
      getInstance: () => ({ getProvider: () => fakeProvider }),
    },
  };
});

import { useConsensusGeneration } from "../useConsensusGeneration";

const answers = [
  { modelId: "a", modelName: "model-a", content: "It is 42." },
  { modelId: "b", modelName: "model-b", content: "42.0" },
  { modelId: "c", modelName: "model-c", content: "41" },
];

describe("useConsensusGeneration majority vote", () => {
  beforeEach(() => {
    useStore.getState().resetStreamingState();
    useStore.setState({
      consensusMethod: "majority",
      summarizerModel: "gpt-6-astra",
    });
  });

  it("stores the winning answer and the vote breakdown", async () => {
    const { result } = renderHook(() => useConsensusGeneration());

    await act(() => result.current.generateConsensus(answers, "6 x 7?"));

    const state = useStore.getState();
    expect(state.metaAnalysis).toBe("42");
    expect(state.majorityVote).toMatchObject({
      method: "vote",
      vote: { status: "winner", winner: { votes: 2, modelIds: ["a", "b"] } },
      modelNames: { a: "model-a", b: "model-b", c: "model-c" },
    });
    expect(state.consensusUsage).toHaveLength(1);
    expect(streamResponse).not.toHaveBeenCalled();
  });

  it("clears the vote when the run is reset", async () => {
    const { result } = renderHook(() => useConsensusGeneration());
    await act(() => result.current.generateConsensus(answers, "q"));
    act(() => useStore.getState().resetStreamingState());
    expect(useStore.getState().majorityVote).toBeNull();
  });
});
