import type { ProDeps } from "../proRunService";
import {
  prepareProStream,
  streamProCall,
  type ProCallRef,
  type StreamRequest,
} from "../proCalls";

/** Stream helpers of the Pro emulator tests: fake OpenRouter responses and the client's two-step stream. */
export function sse(events: unknown[]) {
  const text =
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
    "data: [DONE]\n\n";
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** A stream that sends one chunk, then waits until its request is aborted. */
export function hanging(signal: AbortSignal | null | undefined) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: "partial answer" } }] })}\n\n`,
        ),
      );
      signal?.addEventListener("abort", () =>
        controller.error(new DOMException("aborted", "AbortError")),
      );
    },
  });
  return new Response(body, { status: 200 });
}

export async function collect<T>(gen: AsyncGenerator<T>) {
  const out: T[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

/** A streamed call as the client makes it: prepareStream, then the subscription. */
export async function* streamCall(
  deps: ProDeps,
  uid: string,
  call: ProCallRef & StreamRequest,
  signal?: AbortSignal,
) {
  await prepareProStream(deps, uid, call);
  yield* streamProCall(
    deps,
    uid,
    { runId: call.runId, callId: call.callId },
    signal,
  );
}
