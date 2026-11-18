/**
 * Presets and id helpers for OpenAI-compatible endpoints.
 *
 * Several endpoints can be configured at once. They all sit behind the one
 * provider name `openai-compatible`, and each model id is qualified with its
 * endpoint: `${endpointId}/${modelId}`, for example `ollama/llama3.2:3b` or
 * `openrouter/meta-llama/llama-3.1-8b-instruct`. Endpoint ids are the preset
 * id, then `${presetId}-2`, `${presetId}-3` and so on, so the preset can be
 * read back from any model id. Whether an endpoint is local also depends on
 * its base URL, which the user can edit (see isLocalEndpoint).
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
  /** Display name. A product name, so it is not translated, except Custom, which the UI translates. */
  label: string;
  /** Default base URL, ending in `/v1`. Empty for Custom. */
  baseURL: string;
  /** A server that usually runs on the user's machine. Only local at a loopback URL (isLocalEndpoint). */
  local: boolean;
  /** The hosted service rejects calls without a key. */
  requiresKey: boolean;
  /**
   * A suggested embedding model. The endpoint is only used for embeddings
   * once its check finds this model in the server's list.
   */
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

/**
 * True when a base URL points at this machine: `localhost`, a `*.localhost`
 * name, 127.0.0.0/8 or `::1`. Private network addresses do not count, since
 * they may be a shared or paid server.
 */
export function isLoopbackURL(baseURL: string): boolean {
  let host: string;
  try {
    host = new URL(baseURL.trim()).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '[::1]' || host === '::1') return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

/**
 * True when an endpoint runs on the user's machine, so its calls cost
 * nothing: a local preset (Ollama, LM Studio, llama.cpp, vLLM) at a loopback
 * URL. A local preset pointed at another host may be paid, and a Custom
 * endpoint on localhost may be a proxy to a paid API, so neither counts.
 */
export function isLocalEndpoint(presetId: string, baseURL: string): boolean {
  return getEndpointPreset(presetId).local && isLoopbackURL(baseURL);
}

/** Host of a URL in lower case, or null when it does not parse. */
export function hostOfURL(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True when the server's model list has the model, allowing for Ollama's
 * `:latest` tag on either side (`nomic-embed-text` matches
 * `nomic-embed-text:latest`).
 */
export function modelListIncludes(listed: readonly string[], modelId: string): boolean {
  const wanted = modelId.trim().replace(/:latest$/, '');
  if (!wanted) return false;
  return listed.some((id) => id.replace(/:latest$/, '') === wanted);
}
