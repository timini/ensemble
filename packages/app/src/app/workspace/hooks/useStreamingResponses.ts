import { useEffect, useRef } from "react";
import { useStore } from "~/store";
import {
  ProviderRegistry,
  type ProviderName,
} from "@ensemble-ai/shared-utils/providers";
import { initializeProviders } from "~/providers";
import { FALLBACK_MODELS } from "~/lib/models";
import { formatModelLabelFromId } from "~/lib/providerModels";
import { endpointModelName } from "~/lib/endpointModels";
import { logger } from "~/lib/logger";
import { toResponseError } from "~/lib/responseErrors";
import { selectRunModels, selectRunPrompt } from "~/store/slices/responseSlice";
import type { ModelSelection } from "~/store";

interface UseStreamingResponsesProps {
  mode: "free" | "pro" | "mock";
}

/** Name shown for a model while and after it answers. */
function displayNameOf(model: ModelSelection): string {
  if (!model.model) return "Unknown Model";
  if (model.provider === "openai-compatible") {
    return endpointModelName(model.model, useStore.getState().endpoints);
  }
  return (
    FALLBACK_MODELS.find((m) => m.id === model.model)?.name ??
    formatModelLabelFromId(model.model)
  );
}

/**
 * Starts runs and streams the answers. `startRun` records the prompt and
 * the models of the run (so later edits to the ensemble never change the
 * run on screen) and streams every model in parallel. `retryModel` streams
 * one model of the run again. Chunks are buffered and flushed to the store
 * every 100 ms. Nothing starts on mount: a stored run is shown as it was,
 * and an answer cut off by a reload is marked interrupted with a retry.
 *
 * Each stream has its own buffer and flush timer, and writes to the store
 * only while it is still the latest stream for its model in the run it was
 * started for. A stream left over from a run that was reset (New question)
 * or replaced (a new run or a retry) is ignored, so it can never mix text
 * into a newer answer or mark it complete.
 */
export function useStreamingResponses({ mode }: UseStreamingResponsesProps) {
  const startStreaming = useStore((state) => state.startStreaming);
  const appendStreamChunk = useStore((state) => state.appendStreamChunk);
  const completeResponse = useStore((state) => state.completeResponse);
  const setError = useStore((state) => state.setError);

  /** Latest stream token per model id. */
  const latestStream = useRef<Record<string, object>>({});
  /** Flush timers of the streams still running, cleared on unmount. */
  const flushIntervals = useRef<Set<NodeJS.Timeout>>(new Set());

  const streamModel = async (modelId: string) => {
    const state = useStore.getState();
    const model = selectRunModels(state).find((m) => m.id === modelId);
    const prompt = selectRunPrompt(state);
    if (!model || !prompt) return;

    initializeProviders();
    const registry = ProviderRegistry.getInstance();
    startStreaming(model.id, model.provider, displayNameOf(model));

    const token = {};
    latestStream.current[modelId] = token;
    const runStartedAt = state.runStartedAt;
    const isCurrent = () =>
      latestStream.current[modelId] === token &&
      useStore.getState().runStartedAt === runStartedAt;

    let buffer = "";
    let interval: NodeJS.Timeout | null = null;
    const stopFlushing = () => {
      if (interval) {
        clearInterval(interval);
        flushIntervals.current.delete(interval);
        interval = null;
      }
    };
    const flushBuffer = () => {
      if (!isCurrent()) {
        stopFlushing();
        return;
      }
      if (buffer) {
        appendStreamChunk(modelId, buffer);
        buffer = "";
      }
    };
    interval = setInterval(flushBuffer, 100);
    flushIntervals.current.add(interval);

    const fail = (error: Error) => {
      stopFlushing();
      if (!isCurrent()) return;
      logger.error(`[useStreamingResponses] Error for ${modelId}:`, error);
      const failure = toResponseError(error);
      setError(model.id, failure.message, failure.details);
    };

    try {
      const clientMode =
        process.env.NEXT_PUBLIC_MOCK_MODE === "true" ? "mock" : mode;
      if (!registry.hasProvider(model.provider as ProviderName, clientMode)) {
        throw new Error(
          `Provider ${model.provider} not available in ${clientMode} mode`,
        );
      }
      const providerClient = registry.getProvider(
        model.provider as ProviderName,
        clientMode,
      );
      // Read keys at call time to avoid stale closures. OpenAI-compatible
      // endpoints may need no key; their client reports a missing endpoint.
      const apiKey =
        model.provider === "openai-compatible"
          ? null
          : useStore.getState().apiKeys[model.provider]?.key;
      if (
        clientMode === "free" &&
        model.provider !== "openai-compatible" &&
        !apiKey
      ) {
        throw new Error(`Missing API key for ${model.provider}.`);
      }

      await providerClient.streamResponse(
        prompt,
        model.model,
        (chunk) => {
          if (isCurrent()) buffer += chunk;
        },
        (_fullResponse, responseTime, tokenCount, usage) => {
          flushBuffer();
          stopFlushing();
          if (!isCurrent()) return;
          completeResponse(model.id, responseTime, tokenCount, usage);
        },
        fail,
      );
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    }
  };

  /** Starts a run of the current ensemble on `prompt`. Ignores an empty prompt. */
  const startRun = (prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    const models = useStore.getState().selectedModels;
    // Clears the previous run's answers, agreement and consensus.
    useStore.getState().startRun(text, models);
    void Promise.all(models.map((m) => streamModel(m.id)));
  };

  useEffect(() => {
    const intervals = flushIntervals.current;
    return () => {
      intervals.forEach((interval) => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  return { startRun, retryModel: streamModel };
}
