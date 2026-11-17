import {
  getEndpointPreset,
  parseEndpointModelId,
  presetIdOfEndpoint,
  type EndpointPresetId,
} from '../providers/clients/openaiCompatible/endpointPresets';
import type { ModelPrice, PriceTable } from './types';

/**
 * Hosted endpoints whose model ids use OpenRouter's `vendor/model` form, so a
 * table entry can be found by its OpenRouter id. For Groq and Together this
 * is the OpenRouter list price of the same model, which can differ a little
 * from the host's own price; models with no entry stay unpriced.
 */
const PRICED_BY_OPENROUTER_ID: readonly EndpointPresetId[] = ['openrouter', 'groq', 'together'];

/**
 * Price of a model on an OpenAI-compatible endpoint, from its qualified id
 * (`ollama/llama3.2:3b`). Local presets cost nothing and are marked `local`.
 * OpenRouter, Groq and Together use the price table where it has the model.
 * Everything else, including Custom endpoints, is unknown.
 */
export function getEndpointModelPrice(qualifiedId: string, table: PriceTable): ModelPrice {
  const parsed = parseEndpointModelId(qualifiedId);
  if (!parsed) return { status: 'unknown' };

  const preset = getEndpointPreset(presetIdOfEndpoint(parsed.endpointId));
  if (preset.local) {
    return { status: 'known', inputPerMillion: 0, outputPerMillion: 0, local: true };
  }
  if (!PRICED_BY_OPENROUTER_ID.includes(preset.id)) return { status: 'unknown' };

  const wanted = parsed.modelId.toLowerCase();
  const entry = Object.values(table.models).find((e) => e.openRouterId.toLowerCase() === wanted);
  return entry
    ? { status: 'known', inputPerMillion: entry.inputPerMillion, outputPerMillion: entry.outputPerMillion }
    : { status: 'unknown' };
}
