import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelledError } from "@ensemble-ai/shared-utils/providers";

const streamResponse = vi.fn();
const getProvider = vi.fn((_provider: string, _mode: string) => ({
  streamResponse,
}));
const session = vi.hoisted(() => ({
  begin: vi.fn(() => Promise.resolve()),
  cancel: vi.fn(() => Promise.resolve()),
}));
vi.mock("~/providers", () => ({ initializeProviders: vi.fn() }));
vi.mock("~/providers/pro/runtime", () => ({
  getProRuntime: () => ({ session }),
}));
vi.mock("@ensemble-ai/shared-utils/providers", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    ProviderRegistry: {
      getInstance: () => ({ hasProvider: () => true, getProvider }),
    },
  };
});

import { useStore } from "~/store";
import { useStreamingResponses } from "../useStreamingResponses";

const models = [{ id: "a", provider: "openai" as const, model: "gpt-5-mini" }];

/** A stream that runs until its signal aborts, then reports cancelled. */
function hangUntilAborted() {
  streamResponse.mockImplementation(
    (
      _p: string,
      _m: string,
      onChunk: (c: string) => void,
      _done: unknown,
      onError: (e: Error) => void,
      options?: { signal?: AbortSignal },
    ) => {
      onChunk("partial");
      return new Promise<void>((resolve) => {
        options?.signal?.addEventListener("abort", () => {
          onError(cancelledError());
          resolve();
        });
      });
    },
  );
}

describe("useStreamingResponses: stop and Pro", () => {
  beforeEach(() => {
    streamResponse.mockReset();
    getProvider.mockClear();
    session.begin.mockClear();
    session.cancel.mockClear();
    hangUntilAborted();
    useStore.setState({
      selectedModels: models,
      responses: [],
      mode: "free",
    } as never);
    useStore.setState({
      apiKeys: {
        ...useStore.getState().apiKeys,
        openai: { key: "sk", status: "valid" },
      },
    } as never);
  });

  afterEach(() => useStore.getState().clearResponses());

  it("aborts every stream on stop and marks the answer cancelled", async () => {
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => result.current.startRun("Q"));
    const signal = (streamResponse.mock.calls[0]![5] as { signal: AbortSignal })
      .signal;
    expect(signal.aborted).toBe(false);
    await act(async () => result.current.stop());
    expect(signal.aborted).toBe(true);
    const answer = useStore.getState().responses[0]!;
    expect(answer.errorKind).toBe("cancelled");
    expect(session.cancel).not.toHaveBeenCalled();
  });

  it("aborts the previous run's streams when a new run starts", async () => {
    const { result } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => result.current.startRun("Q1"));
    const first = (streamResponse.mock.calls[0]![5] as { signal: AbortSignal })
      .signal;
    await act(async () => result.current.startRun("Q2"));
    expect(first.aborted).toBe(true);
  });

  it("aborts on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useStreamingResponses({ mode: "free" }),
    );
    await act(async () => result.current.startRun("Q"));
    const signal = (streamResponse.mock.calls[0]![5] as { signal: AbortSignal })
      .signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("in Pro reserves the run first, uses the Pro client and settles on stop", async () => {
    const { result } = renderHook(() => useStreamingResponses({ mode: "pro" }));
    await act(async () => result.current.startRun("What is 2 + 2?"));
    expect(session.begin).toHaveBeenCalledWith(
      expect.objectContaining({
        models: [{ provider: "openai", modelId: "gpt-5-mini" }],
        promptTokens: 4,
      }),
    );
    expect(getProvider).toHaveBeenCalledWith("openai", "pro");
    await act(async () => result.current.stop());
    expect(session.cancel).toHaveBeenCalled();
  });
});
