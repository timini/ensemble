/**
 * Presets and id helpers for OpenAI-compatible endpoints.
 *
 * Several endpoints can be configured at once. They all sit behind the one
 * provider name `openai-compatible`, and each model id is qualified with its
 * endpoint: `${endpointId}/${modelId}`, for example `ollama/llama3.2:3b` or
 * `openrouter/meta-llama/llama-3.1-8b-instruct`. Endpoint ids are the preset
 * id, then `${presetId}-2`, `${presetId}-3` and so on, so the preset (and so
 * whether the endpoint is local) can be read back from any model id.
 */

export type EndpointPresetId =
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'vllm'
  | 'openrouter'
  | 'groq'
  | 'together'
  | 'custom';

export interface EndpointPreset {
  id: EndpointPresetId;
  /** Display name. A product name, so it is not translated. */
  label: string;
  /** Default base URL, ending in `/v1`. Empty for Custom. */
  baseURL: string;
  /** Runs on the user's machine: calls cost nothing. */
  local: boolean;
  /** The hosted service rejects calls without a key. */
  requiresKey: boolean;
  /** A suggested embedding model, when the server usually has one. */
  embeddingModel?: string;
}

/**
 * Base URLs checked against each project's documentation in November 2026.
 * Groq: https://console.groq.com/docs/openai. Together:
 * https://docs.together.ai/docs/openai-api-compatibility.
 */
export const ENDPOINT_PRESETS: readonly EndpointPreset[] = [
  { id: 'ollama', label: 'Ollama', baseURL: 'http://localhost:11434/v1', local: true, requiresKey: false, embeddingModel: 'nomic-embed-text' },
  { id: 'lmstudio', label: 'LM Studio', baseURL: 'http://localhost:1234/v1', local: true, requiresKey: false },
  { id: 'llamacpp', label: 'llama.cpp server', baseURL: 'http://localhost:8080/v1', local: true, requiresKey: false },
  { id: 'vllm', label: 'vLLM', baseURL: 'http://localhost:8000/v1', local: true, requiresKey: false },
  { id: 'openrouter', label: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', local: false, requiresKey: true },
  { id: 'groq', label: 'Groq', baseURL: 'https://api.groq.com/openai/v1', local: false, requiresKey: true },
  { id: 'together', label: 'Together AI', baseURL: 'https://api.together.ai/v1', local: false, requiresKey: true },
  { id: 'custom', label: 'Custom', baseURL: '', local: false, requiresKey: false },
];

const CUSTOM_PRESET = ENDPOINT_PRESETS[ENDPOINT_PRESETS.length - 1]!;

/** The preset with this id, or Custom when the id is unknown. */
export function getEndpointPreset(presetId: string): EndpointPreset {
  return ENDPOINT_PRESETS.find((preset) => preset.id === presetId) ?? CUSTOM_PRESET;
}

/** The preset an endpoint id was made from (`groq-2` gives `groq`). */
export function presetIdOfEndpoint(endpointId: string): EndpointPresetId {
  return getEndpointPreset(endpointId.replace(/-\d+$/, '')).id;
}

/** A free endpoint id for a new endpoint made from `presetId`. */
export function nextEndpointId(presetId: EndpointPresetId, existingIds: readonly string[]): string {
  if (!existingIds.includes(presetId)) return presetId;
  let n = 2;
  while (existingIds.includes(`${presetId}-${n}`)) n += 1;
  return `${presetId}-${n}`;
}

/** Qualify a server's model id with the endpoint it belongs to. */
export function toEndpointModelId(endpointId: string, modelId: string): string {
  return `${endpointId}/${modelId}`;
}

/**
 * Split a qualified model id on its first slash. Endpoint ids never contain
 * a slash, so model ids that do (OpenRouter, Together) are kept whole.
 */
export function parseEndpointModelId(
  qualifiedId: string,
): { endpointId: string; modelId: string } | null {
  const slash = qualifiedId.indexOf('/');
  if (slash <= 0 || slash === qualifiedId.length - 1) return null;
  return { endpointId: qualifiedId.slice(0, slash), modelId: qualifiedId.slice(slash + 1) };
}
