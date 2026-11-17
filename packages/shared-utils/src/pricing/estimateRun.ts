import type { ConsensusMethod } from '@ensemble-ai/consensus-core';
import { countConsensusCalls, type ConsensusPhase, type ConsensusPhaseCalls } from './consensusCalls';
import { getModelPrice } from './prices';
import type { ModelRef, PriceTable } from './types';
import { PRICE_TABLE } from './priceTable';

interface Range {
  low: number;
  high: number;
}

/**
 * Token assumptions behind the cost range. Answer length is unknown before a
 * run, so the low end assumes short answers and the high end long ones
 * (including hidden reasoning tokens, which are billed as output).
 */
export const ESTIMATE_TOKENS = {
  /** Output tokens of one answer, synthesis or summary. */
  answer: { low: 200, high: 2000 } as Range,
  /** Output tokens of a vote, ranking or judge verdict. */
  verdict: { low: 20, high: 400 } as Range,
  /** Output tokens of a council critique or rebuttal. */
  critique: { low: 100, high: 800 } as Range,
  /** Instruction tokens added to each consensus prompt. */
  overhead: 300,
};

export interface EstimateRunInput {
  /** Models that answer the prompt, one call each. */
  models: ModelRef[];
  /** Manual answers: they take part in consensus but make no calls. */
  manualResponseCount?: number;
  consensusMethod: ConsensusMethod;
  /** Summarizer (and ELO judge). Defaults to the first model. */
  summarizer: ModelRef | null;
  eloTopN: number;
  /** Embedding model for the agreement score, or null when there is none. */
  embeddings: ModelRef | null;
  promptTokens: number;
  table?: PriceTable;
}

export interface RunEstimate {
  calls: {
    answers: number;
    consensus: number;
    /** Fewest consensus calls in a successful run. */
    consensusMin: number;
    embeddings: number;
    total: number;
  };
  consensusPhases: ConsensusPhaseCalls[];
  /** False when the method needs more answers than the run will have. */
  consensusAvailable: boolean;
  cost: {
    lowUsd: number;
    highUsd: number;
    /** `provider/model` ids with no price. Their calls are not in the cost. */
    unpricedModels: string[];
    /** Planned calls with a price, counted in the range. */
    pricedCallCount: number;
    /** Planned calls with no price. When above zero the range is a lower bound. */
    unpricedCallCount: number;
    /** Planned calls to local models, which cost nothing. */
    localCallCount: number;
  };
}

type Tokens = (scale: 'low' | 'high') => { input: number; output: number };

/**
 * Estimate the number of calls and the cost range of one run before it
 * starts. Call counts follow the strategy packages (see countConsensusCalls).
 * The cost range comes from ESTIMATE_TOKENS and the price table; models with
 * no price are listed in `unpricedModels` and left out rather than guessed.
 * `pricedCallCount` and `unpricedCallCount` tell a full range from a lower
 * bound, and a lower bound from no price at all.
 */
export function estimateRun(input: EstimateRunInput): RunEstimate {
  const { models, promptTokens: p, eloTopN } = input;
  const table = input.table ?? PRICE_TABLE;
  const n = models.length;
  const r = n + (input.manualResponseCount ?? 0);
  const summarizer = input.summarizer ?? models[0] ?? null;
  const council = input.consensusMethod === 'council';
  const ranked = input.consensusMethod === 'elo' || council;
  const count = countConsensusCalls({
    method: input.consensusMethod,
    modelCount: n,
    responseCount: r,
    eloTopN,
  });

  const cost = {
    lowUsd: 0,
    highUsd: 0,
    unpricedModels: [] as string[],
    pricedCallCount: 0,
    unpricedCallCount: 0,
    localCallCount: 0,
  };
  const charge = (model: ModelRef | null, calls: number, tokens: Tokens) => {
    if (!model || calls <= 0) return;
    const price = getModelPrice(model.provider, model.modelId, table);
    if (price.status !== 'known') {
      const id = `${model.provider}/${model.modelId}`;
      if (!cost.unpricedModels.includes(id)) cost.unpricedModels.push(id);
      cost.unpricedCallCount += calls;
      return;
    }
    cost.pricedCallCount += calls;
    if (price.local) cost.localCallCount += calls;
    const usd = (scale: 'low' | 'high') => {
      const t = tokens(scale);
      return (calls * (t.input * price.inputPerMillion + t.output * price.outputPerMillion)) / 1e6;
    };
    cost.lowUsd += usd('low');
    cost.highUsd += usd('high');
  };

  const { answer: A, verdict: V, critique: C, overhead: O } = ESTIMATE_TOKENS;
  const topK = Math.min(eloTopN > 0 ? eloTopN : 3, r);

  for (const model of models) {
    charge(model, 1, (s) => ({ input: p, output: A[s] }));
  }

  const phaseTokens: Record<ConsensusPhase, Tokens> = {
    synthesis: (s) => ({ input: O + p + r * A[s], output: A[s] }),
    // Majority extracts a short final answer from every response in one call.
    extraction: (s) => ({ input: O + p + r * A[s], output: r * V[s] }),
    // Majority ranks all answers in one call; council judges one pair per call.
    ranking: ranked
      ? (s) => ({ input: O + p + 2 * A[s], output: V[s] })
      : (s) => ({ input: O + p + r * A[s], output: V[s] }),
    judge: (s) => ({ input: O + p + 2 * A[s], output: V[s] }),
    // Council summarises the top branches with their rebuttals.
    summary: (s) => ({
      input: O + p + (ranked ? topK : r) * A[s] + (council ? topK * C[s] : 0),
      output: A[s],
    }),
    critique: (s) => ({ input: O + p + A[s], output: C[s] }),
    rebuttal: (s) => ({ input: O + p + A[s] + (r - 1) * C[s], output: C[s] }),
    judgment: (s) => ({ input: O + p + A[s] + r * C[s], output: V[s] }),
  };

  for (const phase of count.phases) {
    const tokens = phaseTokens[phase.phase];
    if (phase.caller === 'summarizer') {
      charge(summarizer, phase.calls, tokens);
      continue;
    }
    // Council rounds: each model takes an equal share; ranking rotates judges.
    models.forEach((model, index) => {
      const share = Math.floor(phase.calls / n) + (index < phase.calls % n ? 1 : 0);
      charge(model, share, tokens);
    });
  }

  const embeddingCalls = input.embeddings ? n : 0;
  charge(input.embeddings, embeddingCalls, (s) => ({ input: A[s], output: 0 }));

  return {
    calls: {
      answers: n,
      consensus: count.maxCalls,
      consensusMin: count.minCalls,
      embeddings: embeddingCalls,
      total: n + count.maxCalls + embeddingCalls,
    },
    consensusPhases: count.phases,
    consensusAvailable: count.available,
    cost,
  };
}
