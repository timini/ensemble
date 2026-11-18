import {
  estimateTokensFromText,
  usageFromText,
  type CallUsage,
} from "@ensemble-ai/shared-utils/pricing";
import type {
  JsonSchema,
  TokenUsage,
} from "@ensemble-ai/shared-utils/providers";
import { embeddingModelFor, resolveProModel, type ProModel } from "./models";
import type { ProDeps } from "./proRunService";
import { beginProCall, endProCall } from "./runStore";

export interface ProCallRef {
  runId: string;
  callId: string;
}

export type ProStreamEvent =
  | { type: "chunk"; chunk: string }
  | {
      type: "complete";
      response: string;
      responseTimeMs: number;
      usage?: TokenUsage;
    };

function callUsage(
  model: ProModel,
  usage: TokenUsage,
  source: CallUsage["source"],
): CallUsage {
  return {
    provider: model.provider,
    modelId: model.modelId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    source,
  };
}

/** Admit a call, run it, and record its usage whatever happens. */
async function billed<T>(
  deps: ProDeps,
  uid: string,
  ref: ProCallRef,
  inputTokens: number,
  run: (
    maxOutputTokens: number,
  ) => Promise<{ value: T; usage: CallUsage | null }>,
  usageOnError: () => CallUsage | null,
): Promise<T> {
  const { maxOutputTokens } = await beginProCall(deps.db, {
    uid,
    ...ref,
    inputTokens,
    maxCallOutputTokens: deps.config.maxCallOutputTokens,
  });
  let usage: CallUsage | null = null;
  try {
    const result = await run(maxOutputTokens);
    usage = result.usage;
    return result.value;
  } catch (error) {
    usage = usageOnError();
    throw error;
  } finally {
    await endProCall(deps.db, {
      uid,
      ...ref,
      countedInputTokens: inputTokens,
      usage,
    });
  }
}

/**
 * Stream one answer from OpenRouter for a Pro run, as chunk events then a
 * complete event. Aborting `signal` (the client closed the subscription)
 * aborts the upstream request; the text produced until then is recorded as
 * estimated usage, so a cancelled run is billed for what it used.
 */
export async function* streamProCall(
  deps: ProDeps,
  uid: string,
  input: ProCallRef & {
    provider: string;
    model: string;
    prompt: string;
    temperature?: number;
    seed?: number;
  },
  signal?: AbortSignal,
): AsyncGenerator<ProStreamEvent> {
  const model = resolveProModel(
    input.provider,
    input.model,
    deps.credit.priceTable,
  );
  const upstream = deps.upstream();
  const inputTokens = estimateTokensFromText(input.prompt);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  const chunks: string[] = [];
  let text = "";
  let wake: (() => void) | null = null;
  let finished = false;
  // Set from callbacks, so kept in an object TypeScript does not narrow.
  const outcome: { failure: Error | null } = { failure: null };
  let complete: Extract<ProStreamEvent, { type: "complete" }> | null = null;
  const notify = () => {
    wake?.();
    wake = null;
  };

  const ref = { runId: input.runId, callId: input.callId };
  const call = billed(
    deps,
    uid,
    ref,
    inputTokens,
    (maxOutputTokens) =>
      new Promise<{ value: null; usage: CallUsage }>((resolve, reject) => {
        void upstream.client.streamResponse(
          input.prompt,
          upstream.mock ? model.modelId : model.openRouterId,
          (chunk) => {
            text += chunk;
            chunks.push(chunk);
            notify();
          },
          (response, responseTimeMs, _tokens, usage) => {
            complete = {
              type: "complete",
              response,
              responseTimeMs,
              ...(usage ? { usage } : {}),
            };
            resolve({
              value: null,
              usage: usage
                ? callUsage(model, usage, "reported")
                : callUsage(
                    model,
                    usageFromText(input.prompt, response),
                    "estimated",
                  ),
            });
          },
          reject,
          {
            maxTokens: maxOutputTokens,
            signal: controller.signal,
            ...(input.temperature !== undefined && {
              temperature: input.temperature,
            }),
            ...(input.seed !== undefined && { seed: input.seed }),
          },
        );
      }),
    () =>
      text
        ? callUsage(model, usageFromText(input.prompt, text), "estimated")
        : null,
  ).then(
    () => {
      finished = true;
      notify();
    },
    (error: unknown) => {
      outcome.failure =
        error instanceof Error ? error : new Error(String(error));
      finished = true;
      notify();
    },
  );

  try {
    for (;;) {
      const chunk = chunks.shift();
      if (chunk !== undefined) {
        yield { type: "chunk", chunk };
        continue;
      }
      if (finished) break;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
    if (outcome.failure) throw outcome.failure;
    if (complete) yield complete;
  } finally {
    // The subscription ended early (cancel, disconnect): stop the upstream call
    // and wait for its usage to be recorded.
    if (!finished) controller.abort();
    await call;
    signal?.removeEventListener("abort", abort);
  }
}

/** One structured (JSON) call for a Pro run, such as a consensus step. */
export function structuredProCall(
  deps: ProDeps,
  uid: string,
  input: ProCallRef & {
    provider: string;
    model: string;
    prompt: string;
    schema: JsonSchema;
    temperature?: number;
  },
  signal?: AbortSignal,
) {
  const model = resolveProModel(
    input.provider,
    input.model,
    deps.credit.priceTable,
  );
  const upstream = deps.upstream();
  return billed(
    deps,
    uid,
    { runId: input.runId, callId: input.callId },
    estimateTokensFromText(input.prompt),
    async (maxOutputTokens) => {
      const result = await upstream.client.generateStructured<unknown>(
        input.prompt,
        upstream.mock ? model.modelId : model.openRouterId,
        input.schema,
        {
          maxTokens: maxOutputTokens,
          ...(signal ? { signal } : {}),
          ...(input.temperature !== undefined && {
            temperature: input.temperature,
          }),
        },
      );
      const usage = result.usage
        ? callUsage(model, result.usage, "reported")
        : callUsage(
            model,
            usageFromText(input.prompt, result.raw),
            "estimated",
          );
      return { value: { ...result, usage: result.usage ?? usage }, usage };
    },
    () => null,
  );
}

/** One embedding for the agreement score of a Pro run. Embedding usage is estimated from the text. */
export function embedProCall(
  deps: ProDeps,
  uid: string,
  input: ProCallRef & { provider: string; text: string },
  signal?: AbortSignal,
) {
  const model = embeddingModelFor(input.provider, deps.credit.priceTable);
  const upstream = deps.upstream({ embeddingModel: model.openRouterId });
  const inputTokens = estimateTokensFromText(input.text);
  return billed(
    deps,
    uid,
    { runId: input.runId, callId: input.callId },
    inputTokens,
    async () => {
      const vector = await upstream.client.generateEmbeddings(
        input.text,
        signal ? { signal } : undefined,
      );
      return {
        value: vector,
        usage: callUsage(model, { inputTokens, outputTokens: 0 }, "estimated"),
      };
    },
    () => null,
  );
}
