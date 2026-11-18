import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const streamResponse = vi.fn();
vi.mock("~/providers", () => ({ initializeProviders: vi.fn() }));
vi.mock("@ensemble-ai/shared-utils/providers", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    ProviderRegistry: {
      getInstance: () => ({
        hasProvider: () => true,
        getProvider: () => ({ streamResponse }),
      }),
    },
  };
});

import { useStore } from "~/store";
import { useStreamingResponses } from "../useStreamingResponses";

const models = [
  {
    id: "a",
    provider: "openai" as const,
    model: "gpt-4o",
    isSummarizer: false,
  },
  {
    id: "b",
    provider: "openai" as const,
    model: "gpt-4o-mini",
    isSummarizer: false,
  },
];

describe("useStreamingResponses", () => {
  beforeEach(() => {
    streamResponse.mockReset();
    // Answers finish at once, as a completed run would.
    streamResponse.mockImplementation(
      async (
        _prompt: string,
        _model: string,
        _onChunk: (c: string) => void,
        onComplete: (full: string, ms: number) => void,
      ) => {
        onComplete("done", 1);
      },
    );
    useStore.setState({
      selectedModels: models,
      responses: [],
      apiKeys: {
        ...useStore.getState().apiKeys,
        openai: { key: "sk-test", status: "valid" },
      },
    } as never);
  });

  afterEach(() => {
    useStore.getState().clearResponses();
  });

  it("starts nothing on mount, so a stored run is shown but not requested again", async () => {
    useStore.getState().startRun("Q", models);
    await act(async () => {
      renderHook(() => useStreamingResponses({ mode: "free" }));
    });
    expect(streamResponse).not.toHaveBeenCalled();
  });

  it("starts a run: records the prompt and models, then streams every model once", async () => {
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => {
      result.current.startRun("What is 6 times 7?");
    });
    expect(streamResponse).toHaveBeenCalledTimes(2);
    expect(
      streamResponse.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
    ).toEqual([
      ["What is 6 times 7?", "gpt-4o"],
      ["What is 6 times 7?", "gpt-4o-mini"],
    ]);
    const state = useStore.getState();
    expect(state.runPrompt).toBe("What is 6 times 7?");
    expect(state.runModels.map((m) => m.id)).toEqual(["a", "b"]);
    expect(state.responses.every((r) => r.isComplete)).toBe(true);
  });

  it("retries a model of the run even after it left the ensemble", async () => {
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => {
      result.current.startRun("Q");
    });
    useStore.setState({ selectedModels: [models[0]!] } as never);
    streamResponse.mockClear();

    await act(async () => {
      await result.current.retryModel("b");
    });
    expect(streamResponse).toHaveBeenCalledTimes(1);
    expect(streamResponse.mock.calls[0]![1]).toBe("gpt-4o-mini");
  });

  it("does nothing for an empty prompt", async () => {
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => {
      result.current.startRun("   ");
    });
    expect(streamResponse).not.toHaveBeenCalled();
    expect(useStore.getState().runPrompt).toBeNull();
  });

  it("starts a run of manual answers alone with no model calls", async () => {
    useStore.setState({ selectedModels: [] } as never);
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => {
      result.current.startRun("Q");
    });
    expect(streamResponse).not.toHaveBeenCalled();
    expect(useStore.getState().runPrompt).toBe("Q");
  });

  it("ignores a stream from a run that was reset, so it cannot touch the next run", async () => {
    type Callbacks = {
      onChunk: (c: string) => void;
      onComplete: (full: string, ms: number) => void;
      onError: (e: Error) => void;
    };
    const calls: Callbacks[] = [];
    streamResponse.mockImplementation(
      (
        _prompt: string,
        _model: string,
        onChunk: Callbacks["onChunk"],
        onComplete: Callbacks["onComplete"],
        onError: Callbacks["onError"],
      ) => {
        calls.push({ onChunk, onComplete, onError });
        return new Promise(() => undefined);
      },
    );
    useStore.setState({ selectedModels: [models[0]!] } as never);
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        useStreamingResponses({ mode: "free" }),
      );
      act(() => {
        result.current.startRun("First");
      });
      // New question, then a second run with the same model.
      act(() => {
        useStore.getState().resetStreamingState();
      });
      act(() => {
        result.current.startRun("Second");
      });
      expect(calls).toHaveLength(2);
      const [first, second] = calls as [Callbacks, Callbacks];

      act(() => {
        first.onChunk("stale ");
        second.onChunk("fresh");
        vi.advanceTimersByTime(100);
        first.onComplete("stale", 1);
        first.onError(new Error("stale failure"));
      });
      let answer = useStore.getState().responses[0]!;
      expect(answer.response).toBe("fresh");
      expect(answer.isComplete).toBe(false);
      expect(answer.error).toBeNull();

      // The second run's flush timer still runs after the first stream ended.
      act(() => {
        second.onChunk(" answer");
        vi.advanceTimersByTime(100);
      });
      expect(useStore.getState().responses[0]!.response).toBe("fresh answer");

      act(() => {
        second.onComplete("fresh answer", 2);
      });
      answer = useStore.getState().responses[0]!;
      expect(answer.isComplete).toBe(true);
      expect(answer.responseTime).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a stream that ends after New question with no new run", async () => {
    let complete: ((full: string, ms: number) => void) | undefined;
    let chunk: ((c: string) => void) | undefined;
    streamResponse.mockImplementation(
      (
        _p: string,
        _m: string,
        onChunk: (c: string) => void,
        onComplete: (full: string, ms: number) => void,
      ) => {
        chunk = onChunk;
        complete = onComplete;
        return new Promise(() => undefined);
      },
    );
    useStore.setState({ selectedModels: [models[0]!] } as never);
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    act(() => {
      result.current.startRun("Q");
    });
    act(() => {
      useStore.getState().resetStreamingState();
      chunk!("late");
      complete!("late", 1);
    });
    expect(useStore.getState().responses).toEqual([]);
  });
});
