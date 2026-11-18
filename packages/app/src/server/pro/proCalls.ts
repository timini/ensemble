import {
  estimateTokensFromText,
  usageFromText,
  type CallUsage,
} from "@ensemble-ai/shared-utils/pricing";
import {
  isProviderError,
  type JsonSchema,
} from "@ensemble-ai/shared-utils/providers";
import { embeddingModelFor, resolveProModel, type ProModel } from "./models";
import type { ProDeps } from "./proRunService";
import { beginProCall } from "./runStore";
import {
  callUsage,
  endCall,
  failedUsage,
  type ProCallRef,
} from "./proCallBilling";

export type { ProCallRef, ProStreamEvent } from "./proCallBilling";
export {
  prepareProStream,
  streamProCall,
  type StreamRequest,
} from "./proStream";

/** Admit a call, run it, and record its usage whatever happens. */
async function billed<T>(
  deps: ProDeps,
  uid: string,
  ref: ProCallRef,
  model: ProModel,
  inputTokens: number,
  run: (
    maxOutputTokens: number,
  ) => Promise<{ value: T; usage: CallUsage | null }>,
  usageOnError: (error: unknown) => CallUsage | null,
): Promise<T> {
  const { maxOutputTokens } = await beginProCall(deps.db, {
    uid,
    ...ref,
    model: { provider: model.provider, modelId: model.modelId },
    inputTokens,
    maxCallOutputTokens: deps.config.maxCallOutputTokens,
    billing: deps.credit,
  });
  let usage: CallUsage | null = null;
  try {
    const result = await run(maxOutputTokens);
    usage = result.usage;
    return result.value;
  } catch (error) {
    usage = usageOnError(error);
    throw error;
  } finally {
    await endCall(deps, uid, ref, inputTokens, usage);
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
    model,
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
    (error) => failedUsage(model, input.prompt, "", error),
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
  const usage = callUsage(model, { inputTokens, outputTokens: 0 }, "estimated");
  return billed(
    deps,
    uid,
    { runId: input.runId, callId: input.callId },
    model,
    inputTokens,
    async () => {
      const vector = await upstream.client.generateEmbeddings(
        input.text,
        signal ? { signal } : undefined,
      );
      return { value: vector, usage };
    },
    (error) =>
      isProviderError(error) && error.kind === "cancelled" ? usage : null,
  );
}
