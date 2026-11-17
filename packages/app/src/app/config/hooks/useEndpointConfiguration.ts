import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ENDPOINT_PRESETS,
  getEndpointPreset,
  isLocalEndpoint,
  type EndpointPresetId,
} from "@ensemble-ai/shared-utils/providers";
import type {
  EndpointField,
  EndpointInputValue,
} from "@/components/molecules/EndpointInput";
import type { EndpointPresetOption } from "@/components/organisms/EndpointConfiguration";
import { useStore } from "~/store";
import { checkEndpoint } from "~/lib/endpointValidation";
import { canEmbedWithEndpoints } from "~/lib/endpointStatus";
import { toError } from "~/lib/errors";
import { logger } from "~/lib/logger";

const CHECK_DEBOUNCE_MS = 500;

const PRESET_OPTIONS: EndpointPresetOption[] = ENDPOINT_PRESETS.map(
  ({ id, label }) => ({ id, label }),
);

/**
 * State and handlers for the OpenAI-compatible endpoints on the config page.
 * An endpoint is checked (`GET /models`) when it is added, 500 ms after an
 * edit of its base URL, key or embedding model, and on load when its status
 * is idle or its embedding model has not been looked up yet. It shows as
 * Local only when its preset is local and its base URL is loopback.
 *
 * @param enabled - false outside Free mode, or before the store has hydrated
 */
export function useEndpointConfiguration(enabled: boolean) {
  const endpoints = useStore((state) => state.endpoints);
  const addEndpoint = useStore((state) => state.addEndpoint);
  const updateEndpoint = useStore((state) => state.updateEndpoint);
  const setEndpointApiKey = useStore((state) => state.setEndpointApiKey);
  const removeEndpoint = useStore((state) => state.removeEndpoint);
  const setEndpointStatus = useStore((state) => state.setEndpointStatus);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const runCheck = useCallback(
    async (id: string) => {
      const endpoint = useStore.getState().endpoints.find((e) => e.id === id);
      if (!endpoint) return;
      setEndpointStatus(id, "validating");
      const result = await checkEndpoint(endpoint);
      // Drop the result if the endpoint changed or went away meanwhile.
      const current = useStore.getState().endpoints.find((e) => e.id === id);
      if (
        current?.baseURL !== endpoint.baseURL ||
        current.apiKey !== endpoint.apiKey ||
        current.embeddingModel !== endpoint.embeddingModel
      )
        return;
      setEndpointStatus(id, result.status, {
        error: result.error,
        errorCode: result.errorCode,
        modelCount: result.modelCount,
        embeddingModelFound: result.embeddingModelFound,
      });
    },
    [setEndpointStatus],
  );

  const scheduleCheck = useCallback(
    (id: string) => {
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(
        () => void runCheck(id),
        CHECK_DEBOUNCE_MS,
      );
    },
    [runCheck],
  );

  useEffect(() => {
    if (!enabled) return;
    endpoints
      .filter(
        (e) =>
          e.status === "idle" ||
          (e.status === "valid" && e.embeddingModelFound === undefined),
      )
      .forEach((e) => scheduleCheck(e.id));
  }, [enabled, endpoints, scheduleCheck]);

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const items = useMemo<EndpointInputValue[]>(
    () =>
      endpoints.map((endpoint) => {
        const preset = getEndpointPreset(endpoint.presetId);
        return {
          id: endpoint.id,
          presetId: preset.id,
          label: endpoint.label,
          baseURL: endpoint.baseURL,
          apiKey: endpoint.apiKey,
          embeddingModel: endpoint.embeddingModel,
          status: endpoint.status,
          error: endpoint.error,
          errorCode: endpoint.errorCode,
          modelCount: endpoint.modelCount,
          embeddingModelFound: endpoint.embeddingModelFound,
          local: isLocalEndpoint(preset.id, endpoint.baseURL),
          requiresKey: preset.requiresKey,
        };
      }),
    [endpoints],
  );

  const onAdd = (presetId: EndpointPresetId) => {
    addEndpoint(presetId);
  };

  const onChange = (id: string, field: EndpointField, value: string) => {
    if (field === "apiKey") {
      void setEndpointApiKey(id, value)
        .then(() => scheduleCheck(id))
        .catch((error: unknown) =>
          logger.error(
            `Failed to store the ${id} endpoint key`,
            toError(error, "Failed to store an endpoint key"),
          ),
        );
      return;
    }
    updateEndpoint(id, { [field]: value });
    scheduleCheck(id);
  };

  const onRemove = (id: string) => {
    clearTimeout(timers.current[id]);
    removeEndpoint(id);
  };

  return {
    items: enabled ? items : [],
    presets: PRESET_OPTIONS,
    onAdd,
    onChange,
    onRemove,
  };
}

/**
 * Key statuses for the embeddings setting, plus `openai-compatible`: valid
 * when a connected endpoint has an embedding model the server lists.
 *
 * @param statuses - hydrated key validation status per provider
 * @param enabled - false before the store has hydrated
 */
export function useEmbeddingProviderStatuses(
  statuses: Readonly<Record<string, string>>,
  enabled: boolean,
): Record<string, string> {
  const canEmbed = useStore((state) => canEmbedWithEndpoints(state.endpoints));
  return useMemo(
    () => ({
      ...statuses,
      "openai-compatible": enabled && canEmbed ? "valid" : "idle",
    }),
    [statuses, enabled, canEmbed],
  );
}
