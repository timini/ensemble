import type { TokenUsage } from '../providers/types';
import { costOfTokens, getModelPrice } from './prices';
import { PRICE_TABLE } from './priceTable';
import type { EndpointLocation, PriceTable } from './types';

/** Rough characters per token for English text. Used only when a provider reports no usage. */
const CHARS_PER_TOKEN = 4;

/** Estimate a token count from text length. */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Estimate the usage of one call from its prompt and output text. */
export function usageFromText(prompt: string, output: string): TokenUsage {
  return { inputTokens: estimateTokensFromText(prompt), outputTokens: estimateTokensFromText(output) };
}

/** Tokens of one model call in a run. */
export interface CallUsage extends TokenUsage {
  provider: string;
  modelId: string;
  /** `reported` when the provider returned usage, `estimated` from text length otherwise. */
  source: 'reported' | 'estimated';
}

export interface RunCost {
  totalUsd: number;
  /** True when at least one call's tokens were estimated from text length. */
  estimated: boolean;
  callCount: number;
  estimatedCallCount: number;
  /** `provider/model` ids with no price. Their calls are not in the total. */
  unpricedModels: string[];
  /** Calls with a price, counted in the total. */
  pricedCallCount: number;
  /** Calls with no price. When above zero the total is a lower bound. */
  unpricedCallCount: number;
  /** Priced calls to local models, which cost nothing. */
  localCallCount: number;
}

/**
 * Price the calls of a finished run with the price table. `endpoints` are the
 * configured OpenAI-compatible endpoints; their models are unpriced without it.
 */
export function computeRunCost(
  calls: CallUsage[],
  table: PriceTable = PRICE_TABLE,
  endpoints: readonly EndpointLocation[] = [],
): RunCost {
  const result: RunCost = {
    totalUsd: 0,
    estimated: false,
    callCount: calls.length,
    estimatedCallCount: 0,
    unpricedModels: [],
    pricedCallCount: 0,
    unpricedCallCount: 0,
    localCallCount: 0,
  };
  for (const call of calls) {
    if (call.source === 'estimated') {
      result.estimated = true;
      result.estimatedCallCount += 1;
    }
    const price = getModelPrice(call.provider, call.modelId, table, endpoints);
    if (price.status === 'known' && price.local) result.localCallCount += 1;
    const usd = costOfTokens(price, call.inputTokens, call.outputTokens);
    if (usd === null) {
      const id = `${call.provider}/${call.modelId}`;
      if (!result.unpricedModels.includes(id)) result.unpricedModels.push(id);
      result.unpricedCallCount += 1;
    } else {
      result.totalUsd += usd;
      result.pricedCallCount += 1;
    }
  }
  return result;
}
