/**
 * Cost estimate of a matrix run before it spends anything, from the shared
 * price table and estimateRun's token assumptions. Only questions not yet
 * in the results (or the reference cache) are counted, so a resumed run
 * shows what is left to pay.
 */
import {
  ESTIMATE_TOKENS,
  PRICE_TABLE,
  estimateRun,
  getModelPrice,
  type EndpointLocation,
  type ModelRef,
  type PriceTable,
} from '@ensemble-ai/shared-utils/pricing';
import type { StrategyName } from '../../types.js';
import type { MatrixModel } from './config.js';
import type { MatrixJob } from './plan.js';

export interface JobEstimate {
  dataset: string;
  kind: MatrixJob['kind'];
  /** Questions still to run. */
  pending: number;
  calls: number;
  lowUsd: number;
  highUsd: number;
  unpricedModels: string[];
}

export interface MatrixEstimate {
  jobs: JobEstimate[];
  calls: number;
  lowUsd: number;
  highUsd: number;
  unpricedModels: string[];
}

export interface EstimateJobInput {
  job: MatrixJob;
  pending: number;
  /** Mean prompt length of the dataset in tokens. */
  promptTokens: number;
  summarizer: MatrixModel;
  /** Strategies decided by a mechanical vote, which make no calls. */
  mechanicalStrategies: StrategyName[];
  endpoints: readonly EndpointLocation[];
  table?: PriceTable;
}

const refOf = (model: MatrixModel): ModelRef => ({ provider: model.parsed.provider, modelId: model.parsed.model });

/** Cost of the answers alone, as estimateRun charges them. */
function answersCost(input: EstimateJobInput, scale: 'low' | 'high'): number {
  const table = input.table ?? PRICE_TABLE;
  return input.job.models.reduce((sum, model) => {
    const price = getModelPrice(model.parsed.provider, model.parsed.model, table, input.endpoints);
    if (price.status !== 'known') return sum;
    const out = ESTIMATE_TOKENS.answer[scale];
    return sum + (input.promptTokens * price.inputPerMillion + out * price.outputPerMillion) / 1e6;
  }, 0);
}

/** Estimate one job: answers once per question, plus each LLM consensus strategy. */
export function estimateJob(input: EstimateJobInput): JobEstimate {
  const { job, pending } = input;
  const base = {
    models: job.models.map(refOf),
    summarizer: refOf(input.summarizer),
    eloTopN: 3,
    embeddings: null,
    promptTokens: input.promptTokens,
    endpoints: input.endpoints,
    ...(input.table ? { table: input.table } : {}),
  };
  const unpriced = new Set<string>();
  const llmStrategies = job.strategies.filter((s) => !input.mechanicalStrategies.includes(s));
  let calls = job.models.length;
  let low = answersCost(input, 'low');
  let high = answersCost(input, 'high');

  for (const model of job.models) {
    const price = getModelPrice(model.parsed.provider, model.parsed.model, input.table ?? PRICE_TABLE, input.endpoints);
    if (price.status !== 'known') unpriced.add(`${model.parsed.provider}/${model.parsed.model}`);
  }
  for (const strategy of llmStrategies) {
    const estimate = estimateRun({ ...base, consensusMethod: strategy });
    estimate.cost.unpricedModels.forEach((m) => unpriced.add(m));
    calls += estimate.calls.consensus;
    low += estimate.cost.lowUsd - answersCost(input, 'low');
    high += estimate.cost.highUsd - answersCost(input, 'high');
  }
  return {
    dataset: job.dataset,
    kind: job.kind,
    pending,
    calls: calls * pending,
    lowUsd: low * pending,
    highUsd: high * pending,
    unpricedModels: [...unpriced],
  };
}

export function totalEstimate(jobs: JobEstimate[]): MatrixEstimate {
  return {
    jobs,
    calls: jobs.reduce((s, j) => s + j.calls, 0),
    lowUsd: jobs.reduce((s, j) => s + j.lowUsd, 0),
    highUsd: jobs.reduce((s, j) => s + j.highUsd, 0),
    unpricedModels: [...new Set(jobs.flatMap((j) => j.unpricedModels))],
  };
}

const usd = (v: number) => `$${v.toFixed(2)}`;

/** The estimate as a plain-text table for the terminal. */
export function formatEstimate(estimate: MatrixEstimate, budgetUsd: number): string {
  const lines = ['Cost estimate (questions still to run, shared price table):', ''];
  lines.push(`${'dataset'.padEnd(12)}${'job'.padEnd(11)}${'questions'.padStart(10)}${'calls'.padStart(8)}  low      high`);
  for (const job of estimate.jobs) {
    lines.push(
      `${job.dataset.padEnd(12)}${job.kind.padEnd(11)}${String(job.pending).padStart(10)}${String(job.calls).padStart(8)}  ${usd(job.lowUsd).padEnd(9)}${usd(job.highUsd)}`,
    );
  }
  lines.push('');
  lines.push(`Total: ${estimate.calls} calls, ${usd(estimate.lowUsd)} to ${usd(estimate.highUsd)} (budget ${usd(budgetUsd)}).`);
  if (estimate.unpricedModels.length > 0) {
    lines.push(`No price for: ${estimate.unpricedModels.join(', ')}. Their calls are not in the total.`);
  }
  if (estimate.highUsd > budgetUsd) {
    lines.push(`Warning: the high end of the estimate is over the ${usd(budgetUsd)} budget.`);
  }
  return lines.join('\n');
}
