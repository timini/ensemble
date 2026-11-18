import { describe, expect, it, vi } from "vitest";
import { ProRunSession } from "../ProRunSession";
import {
  createProTransport,
  type ProCallApi,
  type ProStreamEvent,
} from "../proTransport";

function session() {
  const s = new ProRunSession(
    { startRun: vi.fn(async () => ({})), finishRun: vi.fn(async () => ({})) },
    { newId: () => "run-1" },
  );
  void s.begin({
    models: [],
    consensusMethod: "standard",
    summarizer: null,
    eloTopN: 0,
    embeddings: null,
    promptTokens: 1,
  });
  return s;
}

type Handlers = Parameters<ProCallApi["streamText"]>[1];

function fakeApi() {
  const handlers: Handlers[] = [];
  const unsubscribe = vi.fn();
  const streamText = vi.fn((_input: unknown, h: Handlers) => {
    handlers.push(h);
    return { unsubscribe };
  });
  const generateStructured = vi.fn(async () => ({
    parsed: { a: 1 },
    raw: "{}",
    responseTimeMs: 1,
  }));
  const generateEmbeddings = vi.fn(async () => [1, 2]);
  const api: ProCallApi = {
    streamText,
    generateStructured,
    generateEmbeddings,
  };
  return {
    api,
    handlers,
    unsubscribe,
    streamText,
    generateStructured,
    generateEmbeddings,
  };
}

const REQ = { provider: "openai" as const, model: "gpt-5-mini", prompt: "Q" };
const ids = () => "call-1";

describe("createProTransport", () => {
  it("streams chunks and resolves with the complete event, inside the run", async () => {
    const { api, handlers, streamText } = fakeApi();
    const transport = createProTransport(api, session(), ids);
    const chunks: string[] = [];
    const done = transport.streamText(REQ, (c) => chunks.push(c));
    await vi.waitFor(() => expect(handlers).toHaveLength(1));
    expect(streamText).toHaveBeenCalledWith(
      { ...REQ, runId: "run-1", callId: "call-1" },
      expect.anything(),
    );
    const h = handlers[0]!;
    h.onData({ type: "chunk", chunk: "Hi" });
    h.onData({
      type: "complete",
      response: "Hi",
      responseTimeMs: 3,
    } as ProStreamEvent);
    await expect(done).resolves.toEqual({ response: "Hi", responseTimeMs: 3 });
    expect(chunks).toEqual(["Hi"]);
  });

  it("unsubscribes and reports cancelled when aborted", async () => {
    const { api, handlers, unsubscribe } = fakeApi();
    const controller = new AbortController();
    const done = createProTransport(api, session(), ids).streamText(
      REQ,
      vi.fn(),
      controller.signal,
    );
    await vi.waitFor(() => expect(handlers).toHaveLength(1));
    controller.abort();
    await expect(done).rejects.toMatchObject({ kind: "cancelled" });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("maps a server error and a stream that ends without an answer", async () => {
    const { api, handlers } = fakeApi();
    const transport = createProTransport(api, session(), ids);
    const first = transport.streamText(REQ, vi.fn());
    await vi.waitFor(() => expect(handlers).toHaveLength(1));
    handlers[0]!.onError(
      Object.assign(new Error("no"), { data: { code: "PAYMENT_REQUIRED" } }),
    );
    await expect(first).rejects.toMatchObject({ kind: "insufficient_credits" });
    const second = transport.streamText(REQ, vi.fn());
    await vi.waitFor(() => expect(handlers).toHaveLength(2));
    handlers[1]!.onComplete();
    await expect(second).rejects.toMatchObject({
      kind: "provider_unavailable",
    });
  });

  it("refuses models from the user's own endpoints", async () => {
    const { api, streamText } = fakeApi();
    const transport = createProTransport(api, session(), ids);
    await expect(
      transport.streamText({ ...REQ, provider: "openai-compatible" }, vi.fn()),
    ).rejects.toMatchObject({ kind: "other" });
    await expect(
      transport.generateStructured({
        ...REQ,
        provider: "openai-compatible",
        schema: { name: "s", schema: {} },
      }),
    ).rejects.toThrow(/Free mode/);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("does not subscribe when already aborted", async () => {
    const { api, streamText } = fakeApi();
    const controller = new AbortController();
    controller.abort();
    await expect(
      createProTransport(api, session(), ids).streamText(
        REQ,
        vi.fn(),
        controller.signal,
      ),
    ).rejects.toMatchObject({ kind: "cancelled" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("sends structured output and embeddings with the run and call ids", async () => {
    const { api, generateStructured } = fakeApi();
    const transport = createProTransport(api, session(), ids);
    const schema = { name: "s", schema: {} };
    await transport.generateStructured({ ...REQ, schema });
    expect(generateStructured).toHaveBeenCalledWith(
      { ...REQ, schema, runId: "run-1", callId: "call-1" },
      undefined,
    );
    await expect(
      transport.generateEmbeddings({ provider: "google", text: "t" }),
    ).resolves.toEqual([1, 2]);
    await expect(
      transport.generateEmbeddings({ provider: "anthropic", text: "t" }),
    ).rejects.toMatchObject({
      name: "EmbeddingsNotSupportedError",
    });
  });

  it("maps failures of structured output and embeddings", async () => {
    const { api, generateStructured, generateEmbeddings } = fakeApi();
    const busy = Object.assign(new Error("busy"), {
      data: { code: "TOO_MANY_REQUESTS" },
    });
    generateStructured.mockRejectedValue(busy);
    generateEmbeddings.mockRejectedValue(busy);
    const transport = createProTransport(api, session(), ids);
    await expect(
      transport.generateStructured({
        ...REQ,
        schema: { name: "s", schema: {} },
      }),
    ).rejects.toMatchObject({
      kind: "rate_limited",
    });
    await expect(
      transport.generateEmbeddings({ provider: "openai", text: "t" }),
    ).rejects.toMatchObject({
      kind: "rate_limited",
    });
  });
});
