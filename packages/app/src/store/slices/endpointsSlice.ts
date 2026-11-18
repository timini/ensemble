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
import {
  decrypt,
  encrypt,
  EncryptionKeyUnavailableError,
  isLegacyCiphertext,
} from "@ensemble-ai/shared-utils/security";
import {
  getEndpointPreset,
  nextEndpointId,
  type EndpointPresetId,
  type OpenAICompatibleEndpointConfig,
} from "@ensemble-ai/shared-utils/providers";
import type { ValidationStatus } from "@/components/molecules/ApiKeyInput";
import type { EndpointErrorCode } from "@/components/molecules/EndpointInput";
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
  /** Server error from the last check. */
  error?: string;
  /** Check failure with no server message, translated by the UI. */
  errorCode?: EndpointErrorCode;
  /** Models listed by the last successful check. */
  modelCount?: number;
  /**
   * Whether the last check found the embedding model in the server's list.
   * Unset until a check runs with the current embedding model. Only a found
   * model is used for embeddings.
   */
  embeddingModelFound?: boolean;
}

export interface EndpointsSlice {
  endpoints: EndpointEntry[];
  /** The user closed the offer to add a running Ollama. Persisted. */
  ollamaOfferDismissed: boolean;

  /**
   * Add an endpoint from a preset and return its id. `overrides` replaces the
   * preset's base URL or embedding model (for example with what detection found).
   */
  addEndpoint: (
    presetId: EndpointPresetId,
    overrides?: Partial<Pick<EndpointEntry, "baseURL" | "embeddingModel">>,
  ) => string;
  dismissOllamaOffer: () => void;
  /**
   * Change the base URL or embedding model. A new base URL needs a new check;
   * a new embedding model needs one before it is used.
   */
  updateEndpoint: (
    id: string,
    patch: Partial<Pick<EndpointEntry, "baseURL" | "embeddingModel">>,
  ) => void;
  setEndpointApiKey: (id: string, key: string) => Promise<void>;
  removeEndpoint: (id: string) => void;
  setEndpointStatus: (
    id: string,
    status: ValidationStatus,
    details?: Pick<
      EndpointEntry,
      "error" | "errorCode" | "modelCount" | "embeddingModelFound"
    >,
  ) => void;
  /** Decrypt persisted keys after the store loads, and reset unfinished checks. */
  initializeEndpointKeys: () => Promise<void>;
}

/**
 * Endpoints for the provider client: connected ones only, with decrypted
 * keys. The embedding model is passed on only when the check found it, so
 * the client never sends embeddings to a model the server does not have.
 */
export function selectEndpointConfigs(
  state: Pick<EndpointsSlice, "endpoints">,
): OpenAICompatibleEndpointConfig[] {
  return state.endpoints
    .filter((endpoint) => endpoint.status === "valid")
    .map(({ id, baseURL, apiKey, embeddingModel, embeddingModelFound }) => ({
      id,
      baseURL,
      apiKey,
      embeddingModel: embeddingModelFound ? embeddingModel : "",
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
    ollamaOfferDismissed: false,

    dismissOllamaOffer: () => set({ ollamaOfferDismissed: true }),

    addEndpoint: (presetId, overrides) => {
      const preset = getEndpointPreset(presetId);
      const id = nextEndpointId(
        preset.id,
        get().endpoints.map((e) => e.id),
      );
      const entry: EndpointEntry = {
        id,
        presetId: preset.id,
        label: labelFor(preset.id, id),
        baseURL: overrides?.baseURL ?? preset.baseURL,
        apiKey: "",
        encryptedApiKey: null,
        embeddingModel:
          overrides?.embeddingModel ?? preset.embeddingModel ?? "",
        status: "idle",
      };
      set((state) => ({ endpoints: [...state.endpoints, entry] }));
      return id;
    },

    updateEndpoint: (id, patch) =>
      patchEndpoint(id, (entry) => {
        if (patch.baseURL !== undefined && patch.baseURL !== entry.baseURL) {
          return {
            ...patch,
            status: "idle",
            error: undefined,
            errorCode: undefined,
            modelCount: undefined,
            embeddingModelFound: undefined,
          };
        }
        if (
          patch.embeddingModel !== undefined &&
          patch.embeddingModel !== entry.embeddingModel
        ) {
          return { ...patch, embeddingModelFound: undefined };
        }
        return patch;
      }),

    setEndpointApiKey: async (id, key) => {
      const trimmed = key.trim();
      if (!trimmed) {
        patchEndpoint(id, () => ({
          apiKey: "",
          encryptedApiKey: null,
          status: "idle",
          error: undefined,
          errorCode: undefined,
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
          errorCode: undefined,
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
        errorCode: details?.errorCode,
        modelCount: details?.modelCount,
        embeddingModelFound: details?.embeddingModelFound,
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
            // Keys stored under the old derived key move to the device key.
            const encryptedApiKey = isLegacyCiphertext(endpoint.encryptedApiKey)
              ? await encrypt(apiKey)
              : endpoint.encryptedApiKey;
            patchEndpoint(endpoint.id, () => ({ apiKey, encryptedApiKey }));
          } catch (error: unknown) {
            logger.error(
              `Failed to decrypt the ${endpoint.id} endpoint key`,
              toError(error, "Failed to decrypt an endpoint key"),
            );
            // Keep the ciphertext when only the key store failed.
            const keep = error instanceof EncryptionKeyUnavailableError;
            patchEndpoint(endpoint.id, (current) => ({
              apiKey: "",
              encryptedApiKey: keep ? current.encryptedApiKey : null,
              status: "idle",
            }));
          }
        }),
      );
    },
  };
};
