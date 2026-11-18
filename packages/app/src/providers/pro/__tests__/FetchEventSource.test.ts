// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FetchEventSource } from "../FetchEventSource";

function streamOf(parts: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((p) => controller.enqueue(encoder.encode(p)));
      controller.close();
    },
  });
}

function until(check: () => boolean) {
  return vi.waitFor(() => {
    if (!check()) throw new Error("not yet");
  });
}

describe("FetchEventSource", () => {
  it("sends the headers and dispatches named and default events", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(
          streamOf([
            'event: connected\ndata: {"reconnectAfterInactivityMs":0}\n\n',
            ": ping comment\n\n",
            'id: 1\ndata: {"a":',
            "1}\n\n",
            "event: return\ndata: \n\n",
          ]),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      );
    const es = new FetchEventSource("http://x/api/trpc/sub", {
      headers: { authorization: "Bearer t" },
      fetch: fetchImpl,
    });
    const seen: { type: string; data: unknown; id?: string }[] = [];
    es.addEventListener("connected", (e) =>
      seen.push({ type: "connected", data: (e as MessageEvent).data }),
    );
    es.addEventListener("message", (e) => {
      const m = e as MessageEvent;
      seen.push({ type: "message", data: m.data, id: m.lastEventId });
    });
    es.addEventListener("return", () =>
      seen.push({ type: "return", data: null }),
    );
    await until(() => seen.length === 3);
    expect(seen).toEqual([
      { type: "connected", data: '{"reconnectAfterInactivityMs":0}' },
      { type: "message", data: '{"a":1}', id: "1" },
      { type: "return", data: null },
    ]);
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer t");
    expect(new Headers(init.headers).get("accept")).toBe("text/event-stream");
    await until(() => es.readyState === es.CLOSED);
  });

  it("reports a failed request as a closed error and never reconnects", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 500 }));
    const es = new FetchEventSource("http://x", { fetch: fetchImpl });
    const onError = vi.fn();
    es.addEventListener("error", onError);
    await until(() => onError.mock.calls.length === 1);
    expect(es.readyState).toBe(es.CLOSED);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("aborts the request on close and stops dispatching", async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    });
    const es = new FetchEventSource("http://x", {
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await until(() => fetchImpl.mock.calls.length === 1);
    const listener = vi.fn();
    es.addEventListener("message", listener);
    es.removeEventListener("message", listener);
    es.close();
    expect(signal?.aborted).toBe(true);
    expect(es.readyState).toBe(es.CLOSED);
  });
});
