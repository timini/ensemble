import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import type { RunEstimate } from '@ensemble-ai/shared-utils/pricing';

/** Builds a RunEstimate for stories and tests. */
export function estimate(
  total: number,
  lowUsd: number,
  highUsd: number,
  extra: { available?: boolean; priced?: number; unpriced?: number; local?: number } = {},
): RunEstimate {
  const priced = extra.priced ?? total;
  return {
    calls: { answers: 3, consensus: total - 6, consensusMin: total - 6, embeddings: 3, total },
    consensusPhases: [],
    consensusAvailable: extra.available ?? true,
    cost: {
      lowUsd,
      highUsd,
      unpricedModels: [],
      pricedCallCount: priced,
      unpricedCallCount: extra.unpriced ?? 0,
      localCallCount: extra.local ?? 0,
    },
  };
}

/** Estimates for three cloud models, one per method. */
export const sampleEstimates: Record<ConsensusMethod, RunEstimate> = {
  standard: estimate(7, 0.004, 0.012),
  majority: estimate(7, 0.004, 0.012),
  elo: estimate(13, 0.009, 0.031),
  council: estimate(22, 0.018, 0.064),
};
