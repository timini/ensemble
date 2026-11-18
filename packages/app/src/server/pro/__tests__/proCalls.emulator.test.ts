import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp } from "firebase-admin/app";
import { closeProRun, startProRun } from "../proRunService";
import { embedProCall, streamProCall, structuredProCall } from "../proCalls";
import { ProRunError, readProRun } from "../runStore";
import { hanging, proKit, RUN } from "./proEmulatorKit";

const { app, db, fetchImpl, deps, reset, fund } = proKit("Pro-calls");

beforeEach(reset);
afterAll(() => deleteApp(app));

describe("Pro calls", () => {
  it("aborts the upstream fetch on cancel and bills the partial answer", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    fetchImpl.mockImplementation((_url: string, init?: RequestInit) => Promise.resolve(hanging(init?.signal)));
    const controller = new AbortController();
    const stream = streamProCall(
      d,
      "u1",
      { runId: "run1", callId: "c1", provider: "openai", model: "gpt-test", prompt: "Hi" },
      controller.signal,
    );
    const first = await stream.next();
    expect(first.value).toEqual({ type: "chunk", chunk: "partial answer" });
    controller.abort();
    await expect(stream.next()).rejects.toMatchObject({ kind: "cancelled" });
    expect((fetchImpl.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);

    const run = await readProRun(db, "u1", "run1");
    expect(run?.calls[0]).toMatchObject({ source: "estimated", outputTokens: 4 });
    const closed = await closeProRun(d, "u1", "run1", { reason: "cancelled" });
    expect(closed.outcome?.type).toBe("settled");
  });

  it("stops the upstream call when the subscription is closed early", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    fetchImpl.mockImplementation((_url: string, init?: RequestInit) => Promise.resolve(hanging(init?.signal)));
    const stream = streamProCall(d, "u1", {
      runId: "run1",
      callId: "c1",
      provider: "openai",
      model: "gpt-test",
      prompt: "Hi",
    });
    await stream.next();
    await stream.return(undefined);
    expect((fetchImpl.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
    expect((await readProRun(db, "u1", "run1"))?.inFlight).toBe(0);
  });

  it("bills structured output and embeddings to the run", async () => {
    await fund("u1");
    const d = deps();
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/embeddings")
          ? new Response(JSON.stringify({ data: [{ embedding: [0.5, 0.5] }] }), { status: 200 })
          : new Response(
              JSON.stringify({
                choices: [{ message: { content: '{"answer":"42"}' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
              }),
              { status: 200 },
            ),
      ),
    );
    const structured = await structuredProCall(d, "u1", {
      runId: "run1",
      callId: "s1",
      provider: "openai",
      model: "gpt-test",
      prompt: "Q",
      schema: { name: "a", schema: { type: "object" } },
    });
    expect(structured.parsed).toEqual({ answer: "42" });
    const vector = await embedProCall(d, "u1", { runId: "run1", callId: "e1", provider: "openai", text: "abcd" });
    expect(vector).toEqual([0.5, 0.5]);
    const embedBody = JSON.parse((fetchImpl.mock.calls[1]![1] as RequestInit).body as string) as { model: string };
    expect(embedBody.model).toBe("openai/text-embedding-3-small");
    const run = await readProRun(db, "u1", "run1");
    expect(run?.calls.map((c) => c.modelId)).toEqual(["gpt-test", "text-embedding-3-small"]);
  });

  it("refuses a repeated call id, a closed run and a spent token budget", async () => {
    await fund("u1");
    const d = deps({ maxRunTokens: 20 });
    await startProRun(d, "u1", { runId: "run1", run: RUN });
    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ data: [{ embedding: [1] }] }), { status: 200 }));
    await embedProCall(d, "u1", { runId: "run1", callId: "e1", provider: "openai", text: "abcd" });
    await expect(
      embedProCall(d, "u1", { runId: "run1", callId: "e1", provider: "openai", text: "abcd" }),
    ).rejects.toMatchObject({ reason: "duplicate_call" });
    await expect(
      embedProCall(d, "u1", { runId: "run1", callId: "e2", provider: "openai", text: "x".repeat(200) }),
    ).rejects.toMatchObject({ reason: "budget" });
    await closeProRun(d, "u1", "run1", { reason: "done" });
    await expect(
      embedProCall(d, "u1", { runId: "run1", callId: "e3", provider: "openai", text: "a" }),
    ).rejects.toBeInstanceOf(ProRunError);
  });
});
