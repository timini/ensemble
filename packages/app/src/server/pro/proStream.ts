import {
  estimateTokensFromText,
  usageFromText,
  type CallUsage,
} from "@ensemble-ai/shared-utils/pricing";
import { resolveProModel } from "./models";
import type { ProDeps } from "./proRunService";
import {
  beginProCall,
  claimPendingStream,
  storePendingStream,
} from "./runStore";
import {
  callUsage,
  endCall,
  failedUsage,
  type ProCallRef,
  type ProStreamEvent,
} from "./proCallBilling";

export interface StreamRequest {
  provider: string;
  model: string;
  prompt: string;
  temperature?: number;
  seed?: number;
}

/**
 * Admit one streamed answer to a run and keep its request until the SSE
 * subscription (streamProCall) picks it up. The prompt comes in this POST
 * body, never in the subscription's URL.
 */
export async function prepareProStream(
  deps: ProDeps,
  uid: string,
  input: ProCallRef & StreamRequest,
): Promise<void> {
  resolveProModel(input.provider, input.model, deps.credit.priceTable);
  const { runId, callId, ...request } = input;
  const countedInputTokens = estimateTokensFromText(request.prompt);
  const { maxOutputTokens } = await beginProCall(deps.db, {
    uid,
    runId,
    callId,
    inputTokens: countedInputTokens,
    maxCallOutputTokens: deps.config.maxCallOutputTokens,
  });
  try {
    await storePendingStream(
      deps.db,
      { uid, runId, callId },
      { ...request, maxOutputTokens, countedInputTokens },
    );
  } catch (error) {
    await endCall(deps, uid, { runId, callId }, countedInputTokens, null);
    throw error;
  }
}

/**
 * Stream one prepared answer from OpenRouter, as chunk events then a
 * complete event. Aborting `signal` (the client closed the subscription)
 * aborts the upstream request; the prompt and the text produced until then
 * are recorded as estimated usage, so a cancelled run pays for what it used.
 */
export async function* streamProCall(
  deps: ProDeps,
  uid: string,
  ref: ProCallRef,
  signal?: AbortSignal,
): AsyncGenerator<ProStreamEvent> {
  const request = await claimPendingStream(deps.db, { uid, ...ref });
  const model = resolveProModel(
    request.provider,
    request.model,
    deps.credit.priceTable,
  );
  const upstream = deps.upstream();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  const chunks: string[] = [];
  // Set from callbacks, so kept in an object TypeScript does not narrow.
  const state: {
    text: string;
    finished: boolean;
    failure: Error | null;
    complete: Extract<ProStreamEvent, { type: "complete" }> | null;
    usage: CallUsage | null;
    wake: (() => void) | null;
  } = {
    text: "",
    finished: false,
    failure: null,
    complete: null,
    usage: null,
    wake: null,
  };
  const notify = () => {
    state.wake?.();
    state.wake = null;
  };

  const call = new Promise<void>((resolve) => {
    const finish = (failure: Error | null, usage: CallUsage | null) => {
      if (state.finished) return;
      state.failure = failure;
      state.usage = usage;
      state.finished = true;
      notify();
      resolve();
    };
    upstream.client
      .streamResponse(
        request.prompt,
        upstream.mock ? model.modelId : model.openRouterId,
        (chunk) => {
          state.text += chunk;
          chunks.push(chunk);
          notify();
        },
        (response, responseTimeMs, _tokens, usage) => {
          state.complete = {
            type: "complete",
            response,
            responseTimeMs,
            ...(usage ? { usage } : {}),
          };
          finish(
            null,
            usage
              ? callUsage(model, usage, "reported")
              : callUsage(
                  model,
                  usageFromText(request.prompt, response),
                  "estimated",
                ),
          );
        },
        (error) =>
          finish(error, failedUsage(model, request.prompt, state.text, error)),
        {
          maxTokens: request.maxOutputTokens,
          signal: controller.signal,
          ...(request.temperature !== undefined && {
            temperature: request.temperature,
          }),
          ...(request.seed !== undefined && { seed: request.seed }),
        },
      )
      .catch((error: unknown) => {
        const failure =
          error instanceof Error ? error : new Error(String(error));
        finish(
          failure,
          failedUsage(model, request.prompt, state.text, failure),
        );
      });
  });

  try {
    for (;;) {
      const chunk = chunks.shift();
      if (chunk !== undefined) {
        yield { type: "chunk", chunk };
        continue;
      }
      if (state.finished) break;
      await new Promise<void>((resolve) => {
        state.wake = resolve;
      });
    }
    if (state.failure) throw state.failure;
    if (state.complete) yield state.complete;
  } finally {
    // The subscription ended early (cancel, disconnect): stop the upstream call.
    if (!state.finished) controller.abort();
    await call;
    signal?.removeEventListener("abort", abort);
    await endCall(deps, uid, ref, request.countedInputTokens, state.usage);
  }
}
