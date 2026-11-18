import { describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
import { getProRuntime, lazyProTransport, setProApiFactory } from "../runtime";

describe("Pro runtime", () => {
  it("creates one session and transport from the API factory", async () => {
    const api = {
      startRun: vi.fn(async () => ({})),
      finishRun: vi.fn(async () => ({})),
      prepareStream: vi.fn(async () => ({})),
      streamText: vi.fn(),
      generateStructured: vi.fn(async () => ({
        parsed: 1,
        raw: "1",
        responseTimeMs: 1,
      })),
      generateEmbeddings: vi.fn(async () => [3]),
    };
    const factory = vi.fn(() => api);
    setProApiFactory(factory);
    const runtime = getProRuntime();
    expect(getProRuntime()).toBe(runtime);
    expect(factory).toHaveBeenCalledTimes(1);

    void runtime.session.begin({
      models: [],
      consensusMethod: "standard",
      summarizer: null,
      eloTopN: 0,
      embeddings: null,
      promptTokens: 1,
    });
    await expect(
      lazyProTransport.generateEmbeddings({ provider: "openai", text: "t" }),
    ).resolves.toEqual([3]);
    await expect(
      lazyProTransport.generateStructured({
        provider: "openai",
        model: "m",
        prompt: "p",
        schema: { name: "s", schema: {} },
      }),
    ).resolves.toMatchObject({ parsed: 1 });
  });

  it("bills a retry of a run restored after a reload to a new run of its models", async () => {
    const api = {
      startRun: vi.fn(async () => ({})),
      finishRun: vi.fn(async () => ({})),
      prepareStream: vi.fn(async () => ({})),
      streamText: vi.fn(),
      generateStructured: vi.fn(),
      generateEmbeddings: vi.fn(async () => [3]),
    };
    // A fresh page: the runtime has never begun a run.
    setProApiFactory(() => api);
    const model = {
      id: "a",
      provider: "openai" as const,
      model: "gpt-5-mini",
      isSummarizer: false,
    };
    useStore.setState({
      selectedModels: [],
      runModels: [model],
      runPrompt: "What is 2+2?",
      responses: [],
    } as never);
    await expect(
      getProRuntime().session.track(async (runId) => runId),
    ).resolves.toEqual(expect.any(String));
    expect(api.startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        models: [{ provider: "openai", modelId: "gpt-5-mini" }],
      }),
    );
    useStore.getState().clearResponses();
  });
});
