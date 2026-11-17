import type { TokenUsage } from '../providers/types';
import { costOfTokens, getModelPrice } from './prices';
import { PRICE_TABLE } from './priceTable';
import type { PriceTable } from './types';

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
}

/** Price the calls of a finished run with the price table. */
export function computeRunCost(calls: CallUsage[], table: PriceTable = PRICE_TABLE): RunCost {
  const result: RunCost = {
    totalUsd: 0,
    estimated: false,
    callCount: calls.length,
    estimatedCallCount: 0,
    unpricedModels: [],
  };
  for (const call of calls) {
    if (call.source === 'estimated') {
      result.estimated = true;
      result.estimatedCallCount += 1;
    }
    const usd = costOfTokens(
      getModelPrice(call.provider, call.modelId, table),
      call.inputTokens,
      call.outputTokens,
    );
    if (usd === null) {
      const id = `${call.provider}/${call.modelId}`;
      if (!result.unpricedModels.includes(id)) result.unpricedModels.push(id);
    } else {
      result.totalUsd += usd;
    }
  }
  return result;
}
