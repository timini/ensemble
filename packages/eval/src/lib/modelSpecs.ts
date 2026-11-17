import {
  ENDPOINT_PRESETS,
  getEndpointPreset,
  parseEndpointModelId,
  presetIdOfEndpoint,
} from '@ensemble-ai/shared-utils/providers';
import type { EvalEndpoint, EvalProvider, ModelSpec } from '../types.js';

const KEY_PROVIDERS: EvalProvider[] = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'];
const KEY_PROVIDER_SET = new Set<EvalProvider>(KEY_PROVIDERS);
const COMPAT_PROVIDER = 'openai-compatible' as const;
const COMPAT_PREFIX = 'compat';
/** Key variable for `compat:` endpoints. */
export const COMPAT_API_KEY_ENV = 'OPENAI_COMPATIBLE_API_KEY';

/** Endpoint presets that can be named directly in a spec (`ollama:llama3.2`). */
const PRESET_IDS = ENDPOINT_PRESETS.filter((preset) => preset.id !== 'custom').map((preset) => preset.id);
const PRESET_ID_SET = new Set<string>(PRESET_IDS);

const SPEC_HELP =
  'Expected "provider:model" (openai:gpt-4o), "<endpoint>:model" (openrouter:qwen/qwen3-14b, ollama:llama3.2) ' +
  'or "compat:<baseURL>#<model>".';

export function explodeList(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/** Small stable hash (djb2, base 36) so a compat base URL always gets the same endpoint id. */
function shortHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function presetEndpoint(presetId: string): EvalEndpoint {
  const preset = getEndpointPreset(presetId);
  const envPrefix = preset.id.toUpperCase();
  const override = process.env[`${envPrefix}_BASE_URL`]?.trim();
  return {
    id: preset.id,
    baseURL: override || preset.baseURL,
    apiKeyEnv: `${envPrefix}_API_KEY`,
    requiresKey: preset.requiresKey,
  };
}

function compatEndpoint(baseURL: string): EvalEndpoint {
  try {
    new URL(baseURL);
  } catch {
    throw new Error(`Invalid base URL "${baseURL}" in compat spec. ${SPEC_HELP}`);
  }
  return {
    id: `${COMPAT_PREFIX}-${shortHash(baseURL)}`,
    baseURL,
    apiKeyEnv: COMPAT_API_KEY_ENV,
    requiresKey: false,
  };
}

function compatSpec(endpoint: EvalEndpoint, modelId: string): ModelSpec {
  return { provider: COMPAT_PROVIDER, model: `${endpoint.id}/${modelId}`, endpoint };
}

/**
 * Parse one model spec. Accepted forms:
 * - `provider:model` for providers with their own API (`openai:gpt-4o`).
 * - `<endpoint>:model` for an OpenAI-compatible preset (`openrouter:qwen/qwen3-14b`,
 *   `ollama:llama3.2:3b`, `groq:...`, `together:...`, `lmstudio:...`, `llamacpp:...`, `vllm:...`).
 *   The base URL comes from the preset, or from `<PRESET>_BASE_URL` when set.
 * - `openai-compatible:<endpoint>/model`, the form results files record.
 * - `compat:<baseURL>#<model>` for any other OpenAI-compatible server.
 */
export function parseModelSpec(value: string): ModelSpec {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new Error(`Invalid model spec "${value}". ${SPEC_HELP}`);
  }

  const prefix = value.slice(0, separatorIndex).trim();
  const rest = value.slice(separatorIndex + 1).trim();
  if (!rest) {
    throw new Error(`Model ID is missing in model spec "${value}".`);
  }

  if (prefix === COMPAT_PREFIX) {
    const hashIndex = rest.lastIndexOf('#');
    const baseURL = hashIndex > 0 ? rest.slice(0, hashIndex).trim() : '';
    const modelId = hashIndex > 0 ? rest.slice(hashIndex + 1).trim() : '';
    if (!baseURL || !modelId) {
      throw new Error(`Invalid model spec "${value}". Expected compat:<baseURL>#<model>.`);
    }
    return compatSpec(compatEndpoint(baseURL), modelId);
  }

  if (PRESET_ID_SET.has(prefix)) {
    return compatSpec(presetEndpoint(prefix), rest);
  }

  if (prefix === COMPAT_PROVIDER) {
    const parsed = parseEndpointModelId(rest);
    const presetId = parsed ? presetIdOfEndpoint(parsed.endpointId) : null;
    if (!parsed || !presetId || !PRESET_ID_SET.has(presetId)) {
      throw new Error(
        `Invalid model spec "${value}". Use <endpoint>:model with one of ${PRESET_IDS.join(', ')}, ` +
          'or compat:<baseURL>#<model>.',
      );
    }
    return compatSpec(presetEndpoint(presetId), parsed.modelId);
  }

  if (!KEY_PROVIDER_SET.has(prefix as EvalProvider)) {
    throw new Error(
      `Invalid provider "${prefix}". Expected one of: ${[...KEY_PROVIDERS, ...PRESET_IDS, COMPAT_PREFIX].join(', ')}.`,
    );
  }

  return { provider: prefix as EvalProvider, model: rest };
}

export function parseModelSpecs(values: string[]): ModelSpec[] {
  const items = explodeList(values).map(parseModelSpec);
  if (items.length === 0) {
    throw new Error('At least one model must be provided via --models.');
  }
  return items;
}

/** Write a spec back in the form it was given (`openrouter:qwen/qwen3-14b`, `compat:<url>#m`). */
export function formatModelSpec(spec: ModelSpec): string {
  if (!spec.endpoint) return `${spec.provider}:${spec.model}`;
  const modelId = spec.model.slice(spec.endpoint.id.length + 1);
  return spec.endpoint.id.startsWith(`${COMPAT_PREFIX}-`)
    ? `${COMPAT_PREFIX}:${spec.endpoint.baseURL}#${modelId}`
    : `${spec.endpoint.id}:${modelId}`;
}

/** The OpenAI-compatible endpoints the specs use, each once, in order. */
export function endpointsOf(specs: ReadonlyArray<ModelSpec | null | undefined>): EvalEndpoint[] {
  const seen = new Map<string, EvalEndpoint>();
  for (const spec of specs) {
    if (spec?.endpoint && !seen.has(spec.endpoint.id)) seen.set(spec.endpoint.id, spec.endpoint);
  }
  return [...seen.values()];
}

/** True when two specs call the same model on the same provider. */
export function sameModel(a: Pick<ModelSpec, 'provider' | 'model'>, b: Pick<ModelSpec, 'provider' | 'model'>): boolean {
  return a.provider === b.provider && a.model === b.model;
}
