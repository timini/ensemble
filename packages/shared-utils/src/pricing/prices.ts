import { PRICE_TABLE } from './priceTable';
import type { EndpointLocation, ModelPrice, PriceTable } from './types';
import { getEndpointModelPrice } from './endpointPrices';

/**
 * Keys to try for a model, most specific first. Handles Anthropic ids written
 * with dots (`claude-opus-5.5`) and Gemini ids with the `models/` prefix that
 * the Gemini model list returns.
 */
export function priceKeyCandidates(provider: string, modelId: string): string[] {
  const keys = [`${provider}/${modelId}`];
  if (provider === 'anthropic' && modelId.includes('.')) {
    keys.push(`${provider}/${modelId.replace(/\./g, '-')}`);
  }
  if (provider === 'google' && modelId.startsWith('models/')) {
    keys.push(`${provider}/${modelId.slice('models/'.length)}`);
  }
  return keys;
}

/**
 * Look up the price of a model in USD per million tokens. Returns
 * `{ status: 'unknown' }` when the table has no entry; callers must show the
 * cost as unknown rather than guess. OpenAI-compatible endpoint models are
 * priced by getEndpointModelPrice from the configured `endpoints`; without
 * them they are unknown.
 */
export function getModelPrice(
  provider: string,
  modelId: string,
  table: PriceTable = PRICE_TABLE,
  endpoints: readonly EndpointLocation[] = [],
): ModelPrice {
  if (provider === 'openai-compatible') return getEndpointModelPrice(modelId, table, endpoints);
  for (const key of priceKeyCandidates(provider, modelId)) {
    const entry = table.models[key];
    if (entry) {
      return {
        status: 'known',
        inputPerMillion: entry.inputPerMillion,
        outputPerMillion: entry.outputPerMillion,
      };
    }
  }
  return { status: 'unknown' };
}

/** Cost in USD of one call, or null when the price is unknown. */
export function costOfTokens(
  price: ModelPrice,
  inputTokens: number,
  outputTokens: number,
): number | null {
  if (price.status !== 'known') return null;
  return (inputTokens * price.inputPerMillion + outputTokens * price.outputPerMillion) / 1_000_000;
}

/** Date the bundled price table was last refreshed (YYYY-MM-DD). */
export const PRICE_TABLE_DATE = PRICE_TABLE.fetchedAt;
