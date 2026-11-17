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
 */
export function useStreamingResponses({ mode }: UseStreamingResponsesProps) {
  const startStreaming = useStore((state) => state.startStreaming);
  const appendStreamChunk = useStore((state) => state.appendStreamChunk);
  const completeResponse = useStore((state) => state.completeResponse);
  const setError = useStore((state) => state.setError);

  const streamBuffers = useRef<Record<string, string>>({});
  const flushIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  const flushBuffer = (modelId: string) => {
    const buffer = streamBuffers.current[modelId];
    if (buffer) {
      appendStreamChunk(modelId, buffer);
      streamBuffers.current[modelId] = "";
    }
  };

  const stopFlushing = (modelId: string) => {
    if (flushIntervals.current[modelId]) {
      clearInterval(flushIntervals.current[modelId]);
      delete flushIntervals.current[modelId];
    }
  };

  const streamModel = async (modelId: string) => {
    const state = useStore.getState();
    const model = selectRunModels(state).find((m) => m.id === modelId);
    const prompt = selectRunPrompt(state);
    if (!model || !prompt) return;

    initializeProviders();
    const registry = ProviderRegistry.getInstance();
    startStreaming(model.id, model.provider, displayNameOf(model));

    streamBuffers.current[modelId] = "";
    stopFlushing(modelId);
    flushIntervals.current[modelId] = setInterval(
      () => flushBuffer(modelId),
      100,
    );

    const fail = (error: Error) => {
      logger.error(`[useStreamingResponses] Error for ${modelId}:`, error);
      stopFlushing(modelId);
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
          streamBuffers.current[modelId] += chunk;
        },
        (_fullResponse, responseTime, tokenCount, usage) => {
          stopFlushing(modelId);
          flushBuffer(modelId);
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
      Object.values(intervals).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  return { startRun, retryModel: streamModel };
}
