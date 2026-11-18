import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProRunSession,
  type ProRunApi,
  type ProRunInput,
} from "../ProRunSession";

const INPUT: ProRunInput = {
  models: [{ provider: "openai", modelId: "gpt-5-mini" }],
  consensusMethod: "standard",
  summarizer: null,
  eloTopN: 0,
  embeddings: null,
  promptTokens: 5,
};

function api(overrides: Partial<ProRunApi> = {}) {
  return {
    startRun: vi.fn(async () => ({})),
    finishRun: vi.fn(async () => ({})),
    ...overrides,
  } satisfies ProRunApi;
}

function ids() {
  let n = 0;
  return () => `run-${++n}`;
}

describe("ProRunSession", () => {
  afterEach(() => vi.useRealTimers());

  it("reserves a run and passes its id to every call", async () => {
    const a = api();
    const session = new ProRunSession(a, { newId: ids() });
    await session.begin(INPUT);
    expect(a.startRun).toHaveBeenCalledWith({ ...INPUT, runId: "run-1" });
    await expect(session.track(async (runId) => runId)).resolves.toBe("run-1");
  });

  it("finishes the previous run when the next one begins", async () => {
    const a = api();
    const session = new ProRunSession(a, { newId: ids() });
    await session.begin(INPUT);
    await session.begin(INPUT);
    await vi.waitFor(() =>
      expect(a.finishRun).toHaveBeenCalledWith({
        runId: "run-1",
        reason: "done",
      }),
    );
  });

  it("finishes a run once it has been idle, then opens a follow-up run for a later call", async () => {
    vi.useFakeTimers();
    const a = api();
    const session = new ProRunSession(a, { idleMs: 1000, newId: ids() });
    await session.begin(INPUT);
    await session.track(async () => "answer");
    await vi.advanceTimersByTimeAsync(1000);
    expect(a.finishRun).toHaveBeenCalledWith({
      runId: "run-1",
      reason: "done",
    });
    await expect(session.track(async (runId) => runId)).resolves.toBe("run-2");
    expect(a.startRun).toHaveBeenLastCalledWith({ ...INPUT, runId: "run-2" });
  });

  it("does not finish while a call is in flight", async () => {
    vi.useFakeTimers();
    const a = api();
    const session = new ProRunSession(a, { idleMs: 10, newId: ids() });
    await session.begin(INPUT);
    let release: () => void = () => undefined;
    const call = session.track(() => new Promise<void>((r) => (release = r)));
    await vi.advanceTimersByTimeAsync(100);
    expect(a.finishRun).not.toHaveBeenCalled();
    release();
    await call;
    await vi.advanceTimersByTimeAsync(10);
    expect(a.finishRun).toHaveBeenCalledTimes(1);
  });

  it("cancels the run so it settles for what it used", async () => {
    const a = api();
    const session = new ProRunSession(a, { newId: ids() });
    const changed = vi.fn();
    session.onChange(changed);
    await session.begin(INPUT);
    await session.cancel();
    expect(a.finishRun).toHaveBeenCalledWith({
      runId: "run-1",
      reason: "cancelled",
    });
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it("fails every call of a run whose reservation was refused", async () => {
    const refused = Object.assign(new Error("Insufficient credits"), {
      data: { code: "PAYMENT_REQUIRED" },
    });
    const a = api({ startRun: vi.fn().mockRejectedValue(refused) });
    const session = new ProRunSession(a, { newId: ids() });
    await expect(session.begin(INPUT)).rejects.toMatchObject({
      kind: "insufficient_credits",
    });
    await session.cancel();
    expect(a.finishRun).not.toHaveBeenCalled();
  });

  it("refuses a call when no run was ever started", async () => {
    await expect(new ProRunSession(api()).track(async () => 1)).rejects.toThrow(
      /No Pro run/,
    );
  });

  it("opens a follow-up run from the restored run when none was begun on this page", async () => {
    const a = api();
    const session = new ProRunSession(a, {
      newId: ids(),
      followUpInput: () => INPUT,
    });
    await expect(session.track(async (runId) => runId)).resolves.toBe("run-1");
    expect(a.startRun).toHaveBeenCalledWith({ ...INPUT, runId: "run-1" });
  });

  it("prices a follow-up run from the current run settings", async () => {
    vi.useFakeTimers();
    const a = api();
    const later = { ...INPUT, consensusMethod: "majority" as const };
    let current: ProRunInput = INPUT;
    const session = new ProRunSession(a, {
      idleMs: 1000,
      newId: ids(),
      followUpInput: () => current,
    });
    await session.begin(INPUT);
    await session.track(async () => "answer");
    await vi.advanceTimersByTimeAsync(1000);
    current = later;
    await session.track(async () => "consensus");
    expect(a.startRun).toHaveBeenLastCalledWith({ ...later, runId: "run-2" });
  });

  it("swallows a failed finish", async () => {
    const a = api({
      finishRun: vi.fn().mockRejectedValue(new Error("offline")),
    });
    const session = new ProRunSession(a, { newId: ids() });
    await session.begin(INPUT);
    await expect(session.finish("done")).resolves.toBeUndefined();
  });
});
