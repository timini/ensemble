import {
  usageFromText,
  type CallUsage,
} from "@ensemble-ai/shared-utils/pricing";
import {
  isProviderError,
  type TokenUsage,
} from "@ensemble-ai/shared-utils/providers";
import { logger } from "~/lib/logger";
import type { ProModel } from "./models";
import { finalizeProRun, type ProDeps } from "./proRunService";
import { endProCall, readProRun } from "./runStore";

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

export function callUsage(
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

/**
 * Usage of a call that failed. A call the user cancelled is billed for its
 * prompt and the text produced so far, since the provider already worked
 * on it. A provider failure with no output is not billed.
 */
export function failedUsage(
  model: ProModel,
  prompt: string,
  text: string,
  error: unknown,
): CallUsage | null {
  const cancelled = isProviderError(error) && error.kind === "cancelled";
  if (!cancelled && !text) return null;
  return callUsage(model, usageFromText(prompt, text), "estimated");
}

/**
 * Record a call's usage and release it from the run. Retried once; a
 * failure is logged and never replaces the call's own result. When the run
 * is closing and this was its last call, the run is settled here.
 */
export async function endCall(
  deps: ProDeps,
  uid: string,
  ref: ProCallRef,
  countedInputTokens: number,
  usage: CallUsage | null,
): Promise<void> {
  const input = { uid, ...ref, countedInputTokens, usage };
  try {
    await endProCall(deps.db, input).catch(() => endProCall(deps.db, input));
    const run = await readProRun(deps.db, uid, ref.runId);
    if (run?.status === "closing" && run.inFlight <= 0) {
      await finalizeProRun(deps, uid, ref.runId, { reason: "done" });
    }
  } catch (error) {
    logger.error(`[pro] Could not record call ${ref.callId}`, error);
  }
}
