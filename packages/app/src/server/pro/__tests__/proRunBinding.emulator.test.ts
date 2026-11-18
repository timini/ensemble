import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp } from "firebase-admin/app";
import { getCreditAccount } from "~/server/credits/creditService";
import { UnpricedModelError } from "../models";
import { closeProRun, startProRun } from "../proRunService";
import { embedProCall, streamProCall, structuredProCall } from "../proCalls";
import { prepareProStream } from "../proStream";
import { ProRunError, readProRun } from "../runStore";
import { CALL, proKit, RUN } from "./proEmulatorKit";
import { collect, sse, streamCall } from "./proStreamKit";

const { app, db, fetchImpl, deps, reset, fund } = proKit("Pro-run-binding");

beforeEach(reset);
afterAll(() => deleteApp(app));

const SCHEMA = { name: "a", schema: { type: "object" } };

describe("Pro calls stay inside the run that was reserved", () => {
  it("refuses a call to a model the run was not priced for", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    await expect(
      structuredProCall(d, "u1", {
        ...CALL,
        callId: "s1",
        model: "gpt-other",
        schema: SCHEMA,
      }),
    ).rejects.toMatchObject({ reason: "model" });
    await expect(
      prepareProStream(d, "u1", { ...CALL, model: "gpt-other" }),
    ).rejects.toMatchObject({ reason: "model" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((await readProRun(db, "u1", "run1"))?.callIds).toEqual([]);
  });

  it("refuses embeddings in a run that reserved none", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", {
      runId: "run1",
      run: { ...RUN, embeddings: null },
    });
    await expect(
      embedProCall(d, "u1", {
        runId: "run1",
        callId: "e1",
        provider: "openai",
        text: "abcd",
      }),
    ).rejects.toMatchObject({ reason: "model" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("allows the summarizer of the run", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", {
      runId: "run1",
      run: { ...RUN, summarizer: { provider: "openai", modelId: "gpt-other" } },
    });
    fetchImpl.mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "{}" } }] }),
        { status: 200 },
      ),
    );
    await expect(
      structuredProCall(d, "u1", {
        ...CALL,
        callId: "s1",
        model: "gpt-other",
        schema: SCHEMA,
      }),
    ).resolves.toMatchObject({ parsed: {} });
  });

  it("refuses to reserve a run with a zero-priced model", async () => {
    await fund("u1");
    const d = deps();
    for (const run of [
      { ...RUN, models: [{ provider: "google", modelId: "free-test" }] },
      { ...RUN, summarizer: { provider: "google", modelId: "free-test" } },
    ]) {
      await expect(
        startProRun(d, "u1", { runId: "run1", run }),
      ).rejects.toBeInstanceOf(UnpricedModelError);
    }
    expect(await readProRun(db, "u1", "run1")).toBeNull();
    expect((await getCreditAccount(db, d.credit, "u1")).balanceMicros).toBe(
      1_000_000,
    );
  });

  it("refuses further calls once the recorded usage has spent the reservation", async () => {
    await fund("u1");
    const d = deps({ maxRunTokens: 1_000_000_000 });
    const started = await startProRun(d, "u1", { runId: "run1", run: RUN });
    // At $1/M input, this many reported input tokens cost more than the reservation.
    const inputTokens = Math.ceil(started.reservedMicros * 2);
    fetchImpl.mockResolvedValue(
      sse([
        { choices: [{ delta: { content: "long" } }] },
        {
          choices: [],
          usage: {
            prompt_tokens: inputTokens,
            completion_tokens: 1,
            total_tokens: inputTokens + 1,
          },
        },
      ]),
    );
    await collect(streamCall(d, "u1", CALL));
    await expect(
      structuredProCall(d, "u1", { ...CALL, callId: "s2", schema: SCHEMA }),
    ).rejects.toMatchObject({ reason: "budget" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("prepared streams of a settled run", () => {
  it("refuses to start a stream prepared before its run was force-closed", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    await prepareProStream(d, "u1", CALL);
    const closed = await closeProRun(d, "u1", "run1", {
      reason: "abandoned",
      waitMs: 0,
      force: true,
    });
    expect(closed.outcome?.type).toBe("refunded");
    fetchImpl.mockResolvedValue(
      sse([{ choices: [{ delta: { content: "free answer" } }] }]),
    );
    await expect(
      collect(streamProCall(d, "u1", { runId: "run1", callId: "c1" })),
    ).rejects.toBeInstanceOf(ProRunError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("still starts a stream prepared before a normal close, and settles after it", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    await prepareProStream(d, "u1", CALL);
    // The prepared stream counts as in flight, so the run stays closing.
    await closeProRun(d, "u1", "run1", { reason: "done", waitMs: 0 });
    expect((await readProRun(db, "u1", "run1"))?.status).toBe("closing");
    fetchImpl.mockResolvedValue(
      sse([{ choices: [{ delta: { content: "ok" } }] }]),
    );
    await expect(
      collect(streamProCall(d, "u1", { runId: "run1", callId: "c1" })),
    ).resolves.toHaveLength(2);
    const run = await readProRun(db, "u1", "run1");
    expect(run?.status).toBe("closed");
    expect(run?.outcome?.type).toBe("settled");
  });
});
