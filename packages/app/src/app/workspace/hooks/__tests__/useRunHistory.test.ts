import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { useStore } from "~/store";
import { listRuns, saveRun } from "~/lib/runHistory";
import { toStoredRun } from "~/lib/runHistoryRecord";
import type { ModelResponse } from "~/store/slices/responseTypes";
import { useRunHistory } from "../useRunHistory";

const answer = (
  modelId: string,
  overrides: Partial<ModelResponse> = {},
): ModelResponse => ({
  modelId,
  provider: "openai",
  model: modelId,
  response: `answer from ${modelId}`,
  isStreaming: false,
  isComplete: true,
  responseTime: 10,
  tokenCount: 3,
  error: null,
  ...overrides,
});

const extras = {
  agreementScore: 0.8,
  agreementLevel: "high" as const,
  costUsd: 0.01,
};

function finishedRun(prompt: string, startedAt: number) {
  useStore.setState({
    runPrompt: prompt,
    prompt,
    runStartedAt: startedAt,
    runModels: [{ id: "a", provider: "openai", model: "a" }],
    responses: [answer("a"), answer("b")],
    manualResponses: [],
    metaAnalysis: `consensus for ${prompt}`,
    historyView: null,
  });
}

function setup(enabled = true) {
  const onOpen = vi.fn();
  const hook = renderHook(() => useRunHistory({ enabled, extras, onOpen }));
  return { hook, onOpen };
}

describe("useRunHistory", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    useStore.getState().resetStreamingState();
    useStore.setState({ manualResponses: [], prompt: null });
  });

  it("saves a finished run and lists it", async () => {
    finishedRun("What is 6 times 7?", 1_000);
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.runs).toHaveLength(1));
    expect(hook.result.current.runs[0]).toMatchObject({
      prompt: "What is 6 times 7?",
      costUsd: 0.01,
    });
    expect(await listRuns()).toHaveLength(1);
  });

  it("keeps the consensus when the next question is asked right after it arrives", async () => {
    finishedRun("First", 1_000);
    useStore.setState({ metaAnalysis: null });
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.runs).toHaveLength(1));

    act(() => useStore.setState({ metaAnalysis: "consensus for First" }));
    act(() => useStore.getState().startRun("Second", []));
    act(() => useStore.getState().startStreaming("a", "openai", "a"));

    await waitFor(async () => {
      const stored = (await listRuns()).find((r) => r.id === "run-1000");
      expect(stored?.metaAnalysis).toBe("consensus for First");
    });
  });

  it("does not save a run while an answer streams", async () => {
    finishedRun("Streaming", 1_000);
    useStore.setState({
      responses: [answer("a", { isStreaming: true, isComplete: false })],
    });
    setup();
    await new Promise((r) => setTimeout(r, 400));
    expect(await listRuns()).toEqual([]);
  });

  it("saves nothing when history is off (Pro mode)", async () => {
    finishedRun("Pro run", 1_000);
    setup(false);
    await new Promise((r) => setTimeout(r, 400));
    expect(await listRuns()).toEqual([]);
  });

  it("opens a stored run read only and stops the live consensus", async () => {
    finishedRun("Older question", 1_000);
    await saveRun(toStoredRun({ ...useStore.getState() }, extras)!);
    finishedRun("Newer question", 2_000);
    const { hook, onOpen } = setup();
    await waitFor(() => expect(hook.result.current.runs).toHaveLength(2));

    act(() => hook.result.current.open("run-1000"));

    const state = useStore.getState();
    expect(onOpen).toHaveBeenCalled();
    expect(state.runPrompt).toBe("Older question");
    expect(state.metaAnalysis).toBe("consensus for Older question");
    expect(state.historyView?.id).toBe("run-1000");
    expect(hook.result.current.currentId).toBe("run-1000");
  });

  it("does not open a stored run while the live run is still streaming", async () => {
    finishedRun("Older question", 1_000);
    await saveRun(toStoredRun({ ...useStore.getState() }, extras)!);
    finishedRun("Live question", 2_000);
    useStore.setState({
      responses: [
        answer("a"),
        answer("b", { isStreaming: true, isComplete: false, response: "half" }),
      ],
    });
    const { hook, onOpen } = setup();
    await waitFor(() => expect(hook.result.current.runs).toHaveLength(1));

    act(() => hook.result.current.open("run-1000"));

    const state = useStore.getState();
    expect(onOpen).not.toHaveBeenCalled();
    expect(state.runPrompt).toBe("Live question");
    expect(state.runStartedAt).toBe(2_000);
    expect(state.historyView).toBeNull();
    expect(state.responses[1]?.isStreaming).toBe(true);
  });

  it("deletes a run, and clears the screen when it was the one shown", async () => {
    finishedRun("Delete me", 1_000);
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.runs).toHaveLength(1));

    await act(() => hook.result.current.remove("run-1000"));

    expect(hook.result.current.runs).toEqual([]);
    expect(useStore.getState().runPrompt).toBeNull();
    await new Promise((r) => setTimeout(r, 400));
    expect(await listRuns()).toEqual([]);
  });

  it("deletes another run without touching the one shown", async () => {
    finishedRun("Keep me", 1_000);
    await saveRun({
      ...toStoredRun({ ...useStore.getState() }, extras)!,
      id: "run-5",
      createdAt: 5,
    });
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.runs).toHaveLength(2));

    await act(() => hook.result.current.remove("run-5"));

    expect(hook.result.current.runs.map((r) => r.id)).toEqual(["run-1000"]);
    expect(useStore.getState().runPrompt).toBe("Keep me");
  });
});
