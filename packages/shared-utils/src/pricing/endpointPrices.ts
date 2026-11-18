import {
  getEndpointPreset,
  hostOfURL,
  isLocalEndpoint,
  parseEndpointModelId,
  presetIdOfEndpoint,
} from '../providers/clients/openaiCompatible/endpointPresets';
import type { EndpointLocation, ModelPrice, PriceTable } from './types';

/**
 * Price of a model on an OpenAI-compatible endpoint, from its qualified id
 * (`ollama/llama3.2:3b`) and the configured endpoints.
 *
 * - A local preset at a loopback URL (isLocalEndpoint) costs nothing and is
 *   marked `local`.
 * - OpenRouter at its own host uses the price table, which holds OpenRouter
 *   prices, where it has the model.
 * - Everything else is unknown: endpoints not in `endpoints`, local presets
 *   at other hosts, Custom endpoints, and Groq and Together, whose own prices
 *   the table does not have.
 */
export function getEndpointModelPrice(
  qualifiedId: string,
  table: PriceTable,
  endpoints: readonly EndpointLocation[] = [],
): ModelPrice {
  const parsed = parseEndpointModelId(qualifiedId);
  if (!parsed) return { status: 'unknown' };
  const endpoint = endpoints.find((e) => e.id === parsed.endpointId);
  if (!endpoint) return { status: 'unknown' };

  const preset = getEndpointPreset(presetIdOfEndpoint(parsed.endpointId));
  if (isLocalEndpoint(preset.id, endpoint.baseURL)) {
    return { status: 'known', inputPerMillion: 0, outputPerMillion: 0, local: true };
  }
  if (preset.id !== 'openrouter') return { status: 'unknown' };
  if (hostOfURL(endpoint.baseURL) !== hostOfURL(preset.baseURL)) return { status: 'unknown' };

  const wanted = parsed.modelId.toLowerCase();
  const entry = Object.values(table.models).find((e) => e.openRouterId.toLowerCase() === wanted);
  return entry
    ? { status: 'known', inputPerMillion: entry.inputPerMillion, outputPerMillion: entry.outputPerMillion }
    : { status: 'unknown' };
}
