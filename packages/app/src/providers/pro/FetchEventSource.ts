/** Options of FetchEventSource: EventSource's, plus request headers. */
export interface FetchEventSourceInit {
  withCredentials?: boolean;
  /** Sent with the request. Native EventSource cannot send headers. */
  headers?: Record<string, string>;
  /** Injected fetch, for tests. */
  fetch?: typeof fetch;
}

type Listener = (event: Event) => void;

/**
 * A small EventSource built on fetch, for tRPC's httpSubscriptionLink. It
 * exists so Pro streams can carry the Firebase ID token and the App Check
 * token as headers rather than in the URL, where request logs would keep
 * them. Unlike the native EventSource it never reconnects: a dropped
 * stream ends in a closed `error`, so a model call is never sent twice.
 */
export class FetchEventSource {
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readyState = 0;
  readonly url: string;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly controller = new AbortController();

  constructor(url: string, init: FetchEventSourceInit = {}) {
    this.url = url;
    void this.run(init);
  }

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = this.CLOSED;
    this.controller.abort();
  }

  private dispatch(type: string, data: string | null, lastEventId = ""): void {
    if (type !== "error" && this.readyState === this.CLOSED) return;
    const event =
      data === null
        ? new Event(type)
        : new MessageEvent(type, { data, lastEventId });
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  private fail(): void {
    if (this.readyState === this.CLOSED && this.controller.signal.aborted)
      return;
    this.readyState = this.CLOSED;
    this.dispatch("error", null);
  }

  private async run(init: FetchEventSourceInit): Promise<void> {
    const doFetch = init.fetch ?? globalThis.fetch.bind(globalThis);
    try {
      const response = await doFetch(this.url, {
        headers: { ...init.headers, accept: "text/event-stream" },
        credentials: init.withCredentials ? "include" : "same-origin",
        signal: this.controller.signal,
      });
      if (!response.ok || !response.body) {
        this.fail();
        return;
      }
      this.readyState = this.OPEN;
      this.dispatch("open", null);
      await this.read(response.body);
      if (this.readyState !== this.CLOSED) this.fail();
    } catch {
      this.fail();
    }
  }

  /** Parse the event stream (WHATWG server-sent events format). */
  private async read(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let type = "";
    let data: string[] = [];
    let id = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r\n|\r|\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line === "") {
          if (data.length > 0 || type) {
            this.dispatch(type || "message", data.join("\n"), id);
          }
          type = "";
          data = [];
          continue;
        }
        if (line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const raw = colon === -1 ? "" : line.slice(colon + 1);
        const text = raw.startsWith(" ") ? raw.slice(1) : raw;
        if (field === "event") type = text;
        else if (field === "data") data.push(text);
        else if (field === "id") id = text;
      }
    }
  }
}
