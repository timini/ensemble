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
import { proRunInput, resolveClientMode } from "~/lib/proMode";
import { getProRuntime } from "~/providers/pro/runtime";
import type { ModelSelection } from "~/store";

interface UseStreamingResponsesProps {
  mode: "free" | "pro";
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
 *
 * Every stream of a run shares one AbortController. A new run, `stop` and
 * unmounting abort it, so the requests really end (in Pro the server then
 * aborts its OpenRouter call). A stopped answer shows as `cancelled` with a
 * retry. In Pro, `startRun` first reserves credits for the run
 * (ProRunSession); a refused reservation fails each answer with its kind.
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
  /** Aborts the streams of the current run. */
  const runAbort = useRef<AbortController | null>(null);

  /** The run's signal; a retry after Stop gets a fresh controller. */
  const runSignal = () => {
    if (!runAbort.current || runAbort.current.signal.aborted) {
      runAbort.current = new AbortController();
    }
    return runAbort.current.signal;
  };

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
      const clientMode = resolveClientMode(mode);
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
        { signal: runSignal() },
      );
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    }
  };

  /** Starts a run of the current ensemble on `prompt`. Ignores an empty prompt. */
  const startRun = (prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    const state = useStore.getState();
    const models = state.selectedModels;
    runAbort.current?.abort();
    runAbort.current = new AbortController();
    // Reserve credits first; every Pro call waits for it (ProRunSession.track).
    if (mode === "pro") {
      getProRuntime()
        .session.begin(proRunInput(state, text))
        .catch(() => undefined);
    }
    // Clears the previous run's answers, agreement and consensus.
    useStore.getState().startRun(text, models);
    void Promise.all(models.map((m) => streamModel(m.id)));
  };

  /**
   * Stops the run: aborts every stream still running. In Pro the run is
   * finished, so it is billed only for what it used.
   */
  const stop = () => {
    runAbort.current?.abort();
    if (mode === "pro") void getProRuntime().session.cancel();
  };

  useEffect(() => {
    const intervals = flushIntervals.current;
    return () => {
      intervals.forEach((interval) => clearInterval(interval));
      intervals.clear();
      runAbort.current?.abort();
    };
  }, []);

  return { startRun, retryModel: streamModel, stop };
}
