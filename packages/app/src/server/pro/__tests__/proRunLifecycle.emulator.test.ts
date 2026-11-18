import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp } from "firebase-admin/app";
import { getCreditAccount } from "~/server/credits/creditService";
import { InsufficientCreditsError } from "~/server/credits/errors";
import { DEFAULT_PRO_CONFIG } from "../config";
import { closeProRun, startProRun } from "../proRunService";
import { RateLimitError } from "../rateLimit";
import { readProRun } from "../runStore";
import { CALL, proKit, RUN } from "./proEmulatorKit";
import { collect, sse, streamCall } from "./proStreamKit";

const { app, db, fetchImpl, deps, reset, fund } = proKit("Pro-run-lifecycle");

beforeEach(reset);
afterAll(() => deleteApp(app));

describe("Pro run lifecycle", () => {
  it("reserves, streams through OpenRouter, records usage and settles at the end", async () => {
    await fund("u1");
    const d = deps();
    const started = await startProRun(d, "u1", { runId: "run1", run: RUN });
    expect(started.reservedMicros).toBeGreaterThan(0);
    expect((await getCreditAccount(db, d.credit, "u1")).balanceMicros).toBe(
      1_000_000 - started.reservedMicros,
    );

    fetchImpl.mockResolvedValue(
      sse([
        { choices: [{ delta: { content: "Hello " } }] },
        { choices: [{ delta: { content: "world" } }] },
        {
          choices: [],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
          },
        },
      ]),
    );
    const events = await collect(streamCall(d, "u1", CALL));
    expect(events.map((e) => e.type)).toEqual(["chunk", "chunk", "complete"]);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(init.body as string) as {
      model: string;
      max_tokens: number;
    };
    expect(body.model).toBe("openai/gpt-test-or");
    expect(body.max_tokens).toBe(DEFAULT_PRO_CONFIG.maxCallOutputTokens);

    const run = await readProRun(db, "u1", "run1");
    expect(run?.calls).toHaveLength(1);
    expect(run?.calls[0]).toMatchObject({
      inputTokens: 100,
      outputTokens: 200,
      source: "reported",
    });
    expect(run?.inFlight).toBe(0);

    const closed = await closeProRun(d, "u1", "run1", { reason: "done" });
    // 100 * $1/M + 200 * $2/M = $0.0005, plus the 30% margin = 650 micros.
    expect(closed.outcome).toEqual({
      type: "settled",
      chargedMicros: 650,
      releasedMicros: started.reservedMicros - 650,
    });
    expect((await getCreditAccount(db, d.credit, "u1")).balanceMicros).toBe(
      1_000_000 - 650,
    );
    expect(
      (await closeProRun(d, "u1", "run1", { reason: "again" })).outcome,
    ).toEqual(closed.outcome);
  });

  it("returns the first reservation when the same run starts again", async () => {
    await fund("u1");
    const first = await startProRun(deps(), "u1", { runId: "run1", run: RUN });
    const again = await startProRun(deps(), "u1", { runId: "run1", run: RUN });
    expect(again).toEqual(first);
  });

  it("refuses a run the balance cannot cover (FR-036)", async () => {
    await expect(
      startProRun(deps(), "poor", { runId: "run1", run: RUN }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("refuses a run with an unpriced model", async () => {
    await fund("u1");
    await expect(
      startProRun(deps(), "u1", {
        runId: "run1",
        run: {
          ...RUN,
          models: [{ provider: "openai", modelId: "gpt-unpriced" }],
        },
      }),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it("refunds a run whose calls all failed", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    fetchImpl.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "bad" } }), {
        status: 503,
      }),
    );
    await expect(collect(streamCall(d, "u1", CALL))).rejects.toMatchObject({
      kind: "provider_unavailable",
    });
    const closed = await closeProRun(d, "u1", "run1", { reason: "failed" });
    expect(closed.outcome?.type).toBe("refunded");
    expect((await getCreditAccount(db, d.credit, "u1")).balanceMicros).toBe(
      1_000_000,
    );
  });

  it("limits how many runs a user starts per window", async () => {
    await fund("u1", 10_000_000);
    const d = deps({ rateLimitRuns: 2 });
    await startProRun(d, "u1", { runId: "r1", run: RUN });
    await startProRun(d, "u1", { runId: "r2", run: RUN });
    await expect(
      startProRun(d, "u1", { runId: "r3", run: RUN }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("settles a user's abandoned runs when they start another", async () => {
    await fund("u1");
    const old = { ...deps(), now: () => Date.now() - 60 * 60_000 };
    await startProRun(old, "u1", { runId: "old", run: RUN });
    await startProRun(deps(), "u1", { runId: "new", run: RUN });
    expect((await readProRun(db, "u1", "old"))?.status).toBe("closed");
    expect((await readProRun(db, "u1", "new"))?.status).toBe("open");
  });

  it("settles a stale run left closing by a crash", async () => {
    await fund("u1");
    const old = { ...deps(), now: () => Date.now() - 60 * 60_000 };
    await startProRun(old, "u1", { runId: "old", run: RUN });
    await db
      .collection("proRuns")
      .doc("u1__old")
      .update({ status: "closing", inFlight: 1 });
    await startProRun(deps(), "u1", { runId: "new", run: RUN });
    expect((await readProRun(db, "u1", "old"))?.outcome?.type).toBe("refunded");
  });
});
