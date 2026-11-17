/**
 * Endpoints Slice
 *
 * OpenAI-compatible endpoints (Ollama, LM Studio, llama.cpp, vLLM,
 * OpenRouter, Groq, Together, Custom). Several can be configured at once.
 * They share the provider name `openai-compatible`; each model id carries its
 * endpoint id as a prefix (`ollama/llama3.2:3b`).
 *
 * Keys are optional (local servers need none). Like provider keys, they are
 * encrypted with AES-GCM before the store is persisted; only the encrypted
 * form reaches localStorage (see sanitizeEndpointsForPersist).
 */

import type { StateCreator } from "zustand";
import { decrypt, encrypt } from "@ensemble-ai/shared-utils/security";
import {
  getEndpointPreset,
  nextEndpointId,
  type EndpointPresetId,
  type OpenAICompatibleEndpointConfig,
} from "@ensemble-ai/shared-utils/providers";
import type { ValidationStatus } from "@/components/molecules/ApiKeyInput";
import { toError } from "~/lib/errors";
import { logger } from "~/lib/logger";

export interface EndpointEntry {
  /** Unique id, also the prefix of the endpoint's model ids. */
  id: string;
  presetId: EndpointPresetId;
  /** Display name: the preset label, numbered when the preset is used twice. */
  label: string;
  baseURL: string;
  /** Decrypted key, empty when none. Never persisted. */
  apiKey: string;
  /** AES-GCM encrypted key, persisted. */
  encryptedApiKey: string | null;
  /** Embedding model on this server, used for agreement scores. */
  embeddingModel: string;
  status: ValidationStatus;
  error?: string;
  /** Models listed by the last successful check. */
  modelCount?: number;
}

export interface EndpointsSlice {
  endpoints: EndpointEntry[];

  /** Add an endpoint from a preset and return its id. */
  addEndpoint: (presetId: EndpointPresetId) => string;
  /** Change the base URL or embedding model. A new base URL needs a new check. */
  updateEndpoint: (
    id: string,
    patch: Partial<Pick<EndpointEntry, "baseURL" | "embeddingModel">>,
  ) => void;
  setEndpointApiKey: (id: string, key: string) => Promise<void>;
  removeEndpoint: (id: string) => void;
  setEndpointStatus: (
    id: string,
    status: ValidationStatus,
    details?: { error?: string; modelCount?: number },
  ) => void;
  /** Decrypt persisted keys after the store loads, and reset unfinished checks. */
  initializeEndpointKeys: () => Promise<void>;
}

/** Endpoints for the provider client: connected ones only, with decrypted keys. */
export function selectEndpointConfigs(
  state: Pick<EndpointsSlice, "endpoints">,
): OpenAICompatibleEndpointConfig[] {
  return state.endpoints
    .filter((endpoint) => endpoint.status === "valid")
    .map(({ id, baseURL, apiKey, embeddingModel }) => ({
      id,
      baseURL,
      apiKey,
      embeddingModel,
    }));
}

/** Endpoint entries as persisted: plaintext keys removed. */
export function sanitizeEndpointsForPersist(
  endpoints: EndpointEntry[],
): EndpointEntry[] {
  return endpoints.map((endpoint) => ({ ...endpoint, apiKey: "" }));
}

function labelFor(presetId: EndpointPresetId, id: string): string {
  const base = getEndpointPreset(presetId).label;
  const n = /-(\d+)$/.exec(id)?.[1];
  return n ? `${base} ${n}` : base;
}

export const createEndpointsSlice: StateCreator<EndpointsSlice> = (
  set,
  get,
) => {
  const patchEndpoint = (
    id: string,
    patch: (entry: EndpointEntry) => Partial<EndpointEntry>,
  ) =>
    set((state) => ({
      endpoints: state.endpoints.map((e) =>
        e.id === id ? { ...e, ...patch(e) } : e,
      ),
    }));

  return {
    endpoints: [],

    addEndpoint: (presetId) => {
      const preset = getEndpointPreset(presetId);
      const id = nextEndpointId(
        preset.id,
        get().endpoints.map((e) => e.id),
      );
      const entry: EndpointEntry = {
        id,
        presetId: preset.id,
        label: labelFor(preset.id, id),
        baseURL: preset.baseURL,
        apiKey: "",
        encryptedApiKey: null,
        embeddingModel: preset.embeddingModel ?? "",
        status: "idle",
      };
      set((state) => ({ endpoints: [...state.endpoints, entry] }));
      return id;
    },

    updateEndpoint: (id, patch) =>
      patchEndpoint(id, (entry) =>
        patch.baseURL !== undefined && patch.baseURL !== entry.baseURL
          ? {
              ...patch,
              status: "idle",
              error: undefined,
              modelCount: undefined,
            }
          : patch,
      ),

    setEndpointApiKey: async (id, key) => {
      const trimmed = key.trim();
      if (!trimmed) {
        patchEndpoint(id, () => ({
          apiKey: "",
          encryptedApiKey: null,
          status: "idle",
          error: undefined,
        }));
        return;
      }
      try {
        const encryptedApiKey = await encrypt(trimmed);
        patchEndpoint(id, () => ({
          apiKey: trimmed,
          encryptedApiKey,
          status: "idle",
          error: undefined,
        }));
      } catch (error: unknown) {
        const normalized = toError(
          error,
          `Failed to encrypt the ${id} endpoint key`,
        );
        logger.error(`Failed to encrypt the ${id} endpoint key`, normalized);
        throw normalized;
      }
    },

    removeEndpoint: (id) =>
      set((state) => ({
        endpoints: state.endpoints.filter((e) => e.id !== id),
      })),

    setEndpointStatus: (id, status, details) =>
      patchEndpoint(id, () => ({
        status,
        error: details?.error,
        modelCount: details?.modelCount,
      })),

    initializeEndpointKeys: async () => {
      // A check cut off by a reload never finished: check again.
      set((state) => ({
        endpoints: state.endpoints.map((e) =>
          e.status === "validating" ? { ...e, status: "idle" } : e,
        ),
      }));
      await Promise.all(
        get().endpoints.map(async (endpoint) => {
          if (!endpoint.encryptedApiKey || endpoint.apiKey) return;
          try {
            const apiKey = await decrypt(endpoint.encryptedApiKey);
            patchEndpoint(endpoint.id, () => ({ apiKey }));
          } catch (error: unknown) {
            logger.error(
              `Failed to decrypt the ${endpoint.id} endpoint key`,
              toError(error, "Failed to decrypt an endpoint key"),
            );
            patchEndpoint(endpoint.id, () => ({
              apiKey: "",
              encryptedApiKey: null,
              status: "idle",
            }));
          }
        }),
      );
    },
  };
};
