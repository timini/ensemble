import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "@ensemble-ai/shared-utils/providers";
import { useStore } from "~/store";

// Each consensus run makes one structured call through the tracked provider.
vi.mock("@ensemble-ai/consensus-standard", () => ({
  StandardConsensus: class {
    constructor(
      private provider: AIProvider,
      private model: string,
    ) {}
    async generateConsensus() {
      await this.provider.generateStructured("summarise", this.model, {
        name: "s",
        schema: {},
      });
      return "consensus text";
    }
  },
}));

const generateStructured = vi.fn(async () => ({
  parsed: {},
  raw: "{}",
  responseTimeMs: 1,
  usage: { inputTokens: 100, outputTokens: 20 },
}));
const fakeProvider = { generateStructured } as unknown as AIProvider;

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
  { modelId: "a", modelName: "A", content: "one" },
  { modelId: "b", modelName: "B", content: "two" },
];

describe("useConsensusGeneration usage", () => {
  beforeEach(() => {
    useStore.getState().resetStreamingState();
    useStore.setState({
      consensusMethod: "standard",
      summarizerModel: "gpt-6-astra",
    });
  });

  it("keeps the usage of earlier attempts when consensus is regenerated", async () => {
    const { result } = renderHook(() => useConsensusGeneration());

    await act(() => result.current.generateConsensus(answers, "q"));
    expect(useStore.getState().consensusUsage).toHaveLength(1);

    // Regenerate with another summarizer: both attempts were billed.
    await act(() =>
      result.current.generateConsensus(answers, "q", "gpt-6-luna"),
    );
    const usage = useStore.getState().consensusUsage;
    expect(usage).toHaveLength(2);
    expect(usage.map((call) => call.modelId)).toEqual([
      "gpt-6-astra",
      "gpt-6-luna",
    ]);
    expect(usage[0]).toMatchObject({
      inputTokens: 100,
      outputTokens: 20,
      source: "reported",
    });
  });

  it("starts from no usage after the run is reset", async () => {
    const { result } = renderHook(() => useConsensusGeneration());
    await act(() => result.current.generateConsensus(answers, "q"));
    act(() => useStore.getState().resetStreamingState());
    expect(useStore.getState().consensusUsage).toEqual([]);
  });
});

describe("useConsensusGeneration restart", () => {
  beforeEach(() => {
    useStore.getState().resetStreamingState();
    useStore.setState({
      consensusMethod: "standard",
      summarizerModel: "gpt-6-astra",
    });
  });

  it("drops the result of a consensus that was still running when restart was called", async () => {
    let finish: () => void = () => undefined;
    generateStructured.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              parsed: {},
              raw: "{}",
              responseTimeMs: 1,
              usage: { inputTokens: 100, outputTokens: 20 },
            } as never);
        }),
    );
    const { result } = renderHook(() => useConsensusGeneration());

    let running: Promise<void> = Promise.resolve();
    act(() => {
      running = result.current.generateConsensus(answers, "q");
    });
    expect(result.current.isGenerating).toBe(true);

    // A failed model is retried while consensus is generating.
    act(() => result.current.restart());
    await act(async () => {
      finish();
      await running;
    });

    expect(useStore.getState().metaAnalysis).toBeNull();
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    // The stale call was still made, so it stays in the run cost.
    expect(useStore.getState().consensusUsage).toHaveLength(1);
  });
});
