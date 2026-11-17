import type { PriceEntry, PriceTable } from './types';

/** Public model list. No key is needed to read it. */
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
/** Public embedding model list, priced the same way. */
export const OPENROUTER_EMBEDDING_MODELS_URL = 'https://openrouter.ai/api/v1/embeddings/models';

/** The parts of an OpenRouter model record the mapping reads. */
export interface OpenRouterModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}

/** OpenRouter vendor prefix to our provider name. */
const VENDOR_TO_PROVIDER: Record<string, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
  'x-ai': 'xai',
  deepseek: 'deepseek',
  perplexity: 'perplexity',
};

/**
 * Vendors of open-weight models that people run through OpenRouter (and
 * that the benchmark matrix uses). Their entries are keyed
 * `openrouter/<OpenRouter id>`; getEndpointModelPrice finds them by
 * `openRouterId` for models called through an OpenRouter endpoint.
 */
const OPEN_WEIGHT_VENDORS = new Set([
  'meta-llama',
  'qwen',
  'mistralai',
  'microsoft',
  'ibm-granite',
  'nvidia',
  'allenai',
]);

/**
 * Map an OpenRouter id such as `anthropic/claude-opus-5.5` to our provider
 * and model id (`anthropic`, `claude-opus-5-5`). Open-weight vendors map to
 * provider `openrouter` with the full OpenRouter id as model id. Returns null
 * for other vendors and for variants such as `:batch` or `:free`, whose
 * prices do not apply to direct API calls.
 */
export function mapOpenRouterId(
  openRouterId: string,
): { provider: string; modelId: string } | null {
  const slash = openRouterId.indexOf('/');
  if (slash <= 0 || openRouterId.includes(':')) return null;

  const vendor = openRouterId.slice(0, slash);
  if (OPEN_WEIGHT_VENDORS.has(vendor)) return { provider: 'openrouter', modelId: openRouterId };
  const provider = VENDOR_TO_PROVIDER[vendor];
  if (!provider) return null;

  let modelId = openRouterId.slice(slash + 1);
  if (provider === 'anthropic') {
    // OpenRouter writes claude-opus-5.5; the Anthropic API uses claude-opus-5-5.
    modelId = modelId.replace(/\./g, '-');
  }
  return { provider, modelId };
}

/**
 * Convert an OpenRouter per-token price string to USD per million tokens.
 * Returns null when the price is missing, negative (OpenRouter uses -1 for
 * routers with variable pricing) or not a number.
 */
export function perTokenToPerMillion(value: string | undefined): number | null {
  if (value === undefined) return null;
  const perToken = Number(value);
  if (!Number.isFinite(perToken) || perToken < 0 || value.trim() === '') return null;
  return Number((perToken * 1_000_000).toPrecision(12));
}

/** Map OpenRouter model records to price entries keyed by `${provider}/${modelId}`. */
export function mapOpenRouterModels(models: OpenRouterModel[]): Record<string, PriceEntry> {
  const entries: Record<string, PriceEntry> = {};
  for (const model of models) {
    const mapped = mapOpenRouterId(model.id);
    if (!mapped) continue;

    const input = perTokenToPerMillion(model.pricing?.prompt);
    // Embedding models have no completion price; they produce no output tokens.
    const output =
      model.pricing?.completion === undefined ? 0 : perTokenToPerMillion(model.pricing.completion);
    if (input === null || output === null) continue;

    entries[`${mapped.provider}/${mapped.modelId}`] = {
      inputPerMillion: input,
      outputPerMillion: output,
      openRouterId: model.id,
    };
  }
  return entries;
}

/**
 * Build the price table from one or more OpenRouter model lists (chat models
 * and embedding models). Keys are sorted so refreshes give small diffs.
 */
export function buildPriceTable(lists: OpenRouterModel[][], fetchedAt: Date): PriceTable {
  const merged: Record<string, PriceEntry> = {};
  for (const list of lists) Object.assign(merged, mapOpenRouterModels(list));

  const models: Record<string, PriceEntry> = {};
  for (const key of Object.keys(merged).sort()) models[key] = merged[key]!;

  return {
    source: OPENROUTER_MODELS_URL,
    fetchedAt: fetchedAt.toISOString().slice(0, 10),
    models,
  };
}
