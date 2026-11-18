import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp } from "firebase-admin/app";
import { getCreditAccount } from "~/server/credits/creditService";
import { closeProRun, startProRun } from "../proRunService";
import { prepareProStream, streamProCall } from "../proCalls";
import { storePendingStream } from "../pendingStreams";
import { beginProCall, ProRunError, readProRun } from "../runStore";
import { CALL, proKit, RUN } from "./proEmulatorKit";
import { collect, hanging } from "./proStreamKit";

const { app, db, fetchImpl, deps, reset, fund } = proKit("Pro-run-cancel");

beforeEach(reset);
afterAll(() => deleteApp(app));

/**
 * Stop can land while an answer is between its two requests: the server
 * admitted it (prepareStream) but the browser, already stopped, never opens
 * its subscription. A cancelled run must not wait for such a stream.
 */
describe("Stop with answers that never started", () => {
  it("settles a cancelled run at once, without the stream it prepared but never started", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    await prepareProStream(d, "u1", CALL);

    const closed = await closeProRun(d, "u1", "run1", {
      reason: "cancelled",
      waitMs: 0,
    });

    expect(closed.outcome?.type).toBe("refunded");
    const run = await readProRun(db, "u1", "run1");
    expect(run).toMatchObject({ status: "closed", inFlight: 0 });
    expect((await getCreditAccount(db, d.credit, "u1")).balanceMicros).toBe(
      1_000_000,
    );
    // A late subscription to it is refused and never reaches the model.
    await expect(
      collect(streamProCall(d, "u1", { runId: "run1", callId: "c1" })),
    ).rejects.toBeInstanceOf(ProRunError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("bills the answer that was streaming and drops the one that never started", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    fetchImpl.mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve(hanging(init.signal)),
    );
    const stop = new AbortController();
    await prepareProStream(d, "u1", CALL);
    const streaming = collect(
      streamProCall(d, "u1", { runId: "run1", callId: "c1" }, stop.signal),
    ).catch(() => undefined);
    await prepareProStream(d, "u1", { ...CALL, callId: "c2" });
    await expect.poll(() => fetchImpl.mock.calls.length).toBe(1);

    stop.abort();
    await streaming;
    await closeProRun(d, "u1", "run1", { reason: "cancelled", waitMs: 2000 });

    const run = await readProRun(db, "u1", "run1");
    expect(run?.status).toBe("closed");
    expect(run?.outcome?.type).toBe("settled");
    expect(run?.calls.map((c) => c.callId)).toEqual(["c1"]);
  });

  it("refuses to keep a stream admitted just before Stop and stored after it", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    // prepareStream admitted the call, then Stop closed the run before the
    // stream was stored.
    await beginProCall(db, {
      uid: "u1",
      runId: "run1",
      callId: "c1",
      model: { provider: "openai", modelId: "gpt-test" },
      inputTokens: 1,
      maxCallOutputTokens: 100,
      billing: d.credit,
    });
    await closeProRun(d, "u1", "run1", { reason: "cancelled", waitMs: 0 });
    await expect(
      storePendingStream(
        db,
        { uid: "u1", runId: "run1", callId: "c1" },
        {
          provider: "openai",
          model: "gpt-test",
          prompt: "Hi",
          maxOutputTokens: 100,
          countedInputTokens: 1,
        },
      ),
    ).rejects.toMatchObject({ reason: "closed" });
  });
});
