/**
 * The results summary of a matrix run (summary.json), which the app's
 * /benchmarks page reads. Accuracy per dataset per configuration with a 95%
 * Wilson interval, a paired McNemar test against the best single open model,
 * and the cost of each configuration. Schema in docs/BENCHMARKS.md.
 */
import type { BenchmarkResultsFile, PromptRunResult, StrategyName } from '../../types.js';
import { comparePaired, withInterval } from '../pairedStats.js';
import type { MatrixConfig } from './config.js';
import { resultKeyOf } from './config.js';
import type { MatrixEstimate } from './estimate.js';

export type ConfigurationKind = 'single' | 'ensemble' | 'reference';

export interface SummaryRow {
  /** `single:qwen`, `ensemble:majority`, `reference`. */
  id: string;
  kind: ConfigurationKind;
  label: string;
  /** Model specs that answered. */
  models: string[];
  strategy?: StrategyName;
  n: number;
  correct: number;
  accuracy: number;
  ciLower: number;
  ciUpper: number;
  /** Answers that failed or timed out (counted wrong). */
  failures: number;
  /** McNemar test against the best single model. Null for the best single model itself. */
  vsBestSingle: { pValue: number; n10: number; n01: number; method: 'exact' | 'chi-squared'; n: number } | null;
  /** Total cost of the configuration on this dataset, from the shared price table. */
  costUsd: number;
  /** True when some calls had no price, so costUsd is a lower bound. */
  costIncomplete: boolean;
}

export interface DatasetSummary {
  dataset: string;
  n: number;
  bestSingleId: string | null;
  rows: SummaryRow[];
  /**
   * Cost of this dataset's results: every answer and consensus call once.
   * Reference answers count even when they came from the shared cache, so this
   * is the cost of the results, not necessarily what this run paid.
   */
  spentUsd: number;
  /** True when some calls had no price, so spentUsd is a lower bound. */
  spentIncomplete: boolean;
  /**
   * Priced cost of earlier attempts that --retry-failed replaced (answers
   * not kept and their consensus calls). Spent on top of spentUsd and not
   * part of any configuration's cost. Absent when nothing was replaced.
   */
  retrySpendUsd?: number;
  /**
   * Set when the reference has results but some of its calls failed. Its row
   * is then left out: a premium model scored on part of the sample, with the
   * rest counted wrong, would say nothing about that model.
   */
  referencePending?: ReferencePending;
}

/** Why a reference call failed, read from the stored error. */
export type ReferenceFailureReason = 'out-of-credit' | 'refused' | 'other';

export interface ReferencePending {
  /** Questions the reference answered. */
  answered: number;
  /** Questions whose reference call failed or timed out. Absent in the published copy. */
  failed?: number;
  /** Absent in the published copy. */
  reasons?: Array<{ reason: ReferenceFailureReason; count: number }>;
}

export interface MatrixSummary {
  schemaVersion: 1;
  status: 'not-run' | 'partial' | 'complete';
  runId: string | null;
  mode: 'mock' | 'free';
  generatedAt: string;
  method: {
    matrix: string;
    description: string;
    datasets: string[];
    sample: number;
    questionSeed: number;
    optionSeed: number;
    protocol: string;
    temperature: number;
    confidence: 0.95;
    models: Array<{ id: string; label: string; spec: string }>;
    summarizer: string;
    strategies: StrategyName[];
    reference: { id: string; label: string; spec: string };
  };
  estimate: { lowUsd: number; highUsd: number; calls: number } | null;
  /** Sum of the datasets' spentUsd: the cost of the results, cached reference answers included. */
  totalCostUsd: number | null;
  /** True when some calls had no price, so totalCostUsd is a lower bound. */
  totalCostIncomplete: boolean;
  datasets: DatasetSummary[];
}

export interface DatasetResults {
  dataset: string;
  ensemble: BenchmarkResultsFile | null;
  reference: BenchmarkResultsFile | null;
}

type Outcomes = Map<string, boolean>;

function outcomes(runs: PromptRunResult[], pick: (run: PromptRunResult) => boolean | undefined): Outcomes {
  const map: Outcomes = new Map();
  for (const run of runs) {
    const value = pick(run);
    if (run.questionId && value !== undefined) map.set(run.questionId, value);
  }
  return map;
}

function row(
  base: Pick<SummaryRow, 'id' | 'kind' | 'label' | 'models' | 'strategy'>,
  result: Outcomes,
  failures: number,
  cost: { usd: number; incomplete: boolean },
): SummaryRow {
  const correct = [...result.values()].filter(Boolean).length;
  const ci = withInterval(correct, result.size);
  return {
    ...base,
    n: result.size,
    correct,
    accuracy: ci.accuracy,
    ciLower: ci.lower,
    ciUpper: ci.upper,
    failures,
    vsBestSingle: null,
    costUsd: cost.usd,
    costIncomplete: cost.incomplete,
  };
}

/** Sum of answer costs for the responses `keep` selects. */
function answerCost(runs: PromptRunResult[], keep: (key: string) => boolean) {
  let usd = 0;
  let incomplete = false;
  for (const run of runs) {
    for (const response of run.responses) {
      if (!keep(`${response.provider}:${response.model}`) || response.error) continue;
      if (response.estimatedCostUsd === undefined) incomplete = true;
      else usd += response.estimatedCostUsd;
    }
  }
  return { usd, incomplete };
}

function consensusCost(runs: PromptRunResult[], strategy: StrategyName) {
  let usd = 0;
  let incomplete = false;
  for (const run of runs) {
    const metrics = run.consensusMetrics?.[strategy];
    if (!metrics) continue;
    if (metrics.costUsd === undefined) incomplete = true;
    else usd += metrics.costUsd;
  }
  return { usd, incomplete };
}

function failuresOf(runs: PromptRunResult[], pick: (run: PromptRunResult) => { failure?: unknown } | undefined) {
  return runs.filter((run) => Boolean(pick(run)?.failure)).length;
}

function strategyLabel(strategy: StrategyName): string {
  return strategy === 'majority' ? 'Ensemble, mechanical majority' : `Ensemble, ${strategy} consensus`;
}

/** Summary of one dataset from its ensemble and reference results. */
export function summarizeDataset(config: MatrixConfig, results: DatasetResults): DatasetSummary {
  const ensembleRuns = results.ensemble?.runs ?? [];
  const referenceRuns = results.reference?.runs ?? [];
  const rows: SummaryRow[] = [];
  const outcomeById = new Map<string, Outcomes>();

  for (const model of config.models) {
    const key = resultKeyOf(model);
    const result = outcomes(ensembleRuns, (run) => run.evaluation?.results?.[key]?.correct);
    outcomeById.set(`single:${model.id}`, result);
    rows.push(row(
      { id: `single:${model.id}`, kind: 'single', label: model.label, models: [model.spec] },
      result,
      failuresOf(ensembleRuns, (run) => run.evaluation?.results?.[key]),
      answerCost(ensembleRuns, (k) => k === key),
    ));
  }
  const allAnswers = answerCost(ensembleRuns, () => true);
  let spentUsd = allAnswers.usd;
  let spentIncomplete = allAnswers.incomplete;
  for (const strategy of config.ensembleStrategies) {
    const result = outcomes(ensembleRuns, (run) => run.consensusEvaluation?.results?.[strategy]?.correct);
    outcomeById.set(`ensemble:${strategy}`, result);
    const extra = consensusCost(ensembleRuns, strategy);
    spentUsd += extra.usd;
    spentIncomplete ||= extra.incomplete;
    rows.push(row(
      { id: `ensemble:${strategy}`, kind: 'ensemble', label: strategyLabel(strategy), models: config.models.map((m) => m.spec), strategy },
      result,
      failuresOf(ensembleRuns, (run) => run.consensusEvaluation?.results?.[strategy]),
      { usd: allAnswers.usd + extra.usd, incomplete: allAnswers.incomplete || extra.incomplete },
    ));
  }
  let referencePending: ReferencePending | undefined;
  if (results.reference) {
    const key = resultKeyOf(config.reference);
    const result = outcomes(referenceRuns, (run) => run.evaluation?.results?.[key]?.correct);
    const cost = answerCost(referenceRuns, (k) => k === key);
    spentUsd += cost.usd;
    spentIncomplete ||= cost.incomplete;
    const failures = failuresOf(referenceRuns, (run) => run.evaluation?.results?.[key]);
    if (failures > 0) {
      referencePending = {
        answered: referenceRuns.length - failures,
        failed: failures,
        reasons: referenceFailureReasons(referenceRuns, key),
      };
    } else {
      outcomeById.set('reference', result);
      rows.push(row(
        { id: 'reference', kind: 'reference', label: config.reference.label, models: [config.reference.spec] },
        result,
        failures,
        cost,
      ));
    }
  }

  const singles = rows.filter((r) => r.kind === 'single' && r.n > 0);
  const best = singles.reduce<SummaryRow | null>((top, r) => (!top || r.accuracy > top.accuracy ? r : top), null);
  if (best) {
    const bestOutcomes = outcomeById.get(best.id)!;
    for (const r of rows) {
      if (r.id === best.id) continue;
      const other = outcomeById.get(r.id)!;
      const pairs = [...bestOutcomes.entries()]
        .filter(([id]) => other.has(id))
        .map(([id, modelCorrect]) => ({ modelCorrect, strategyCorrect: other.get(id)! }));
      if (pairs.length === 0) continue;
      const test = comparePaired(pairs);
      r.vsBestSingle = { pValue: test.pValue, n10: test.n10, n01: test.n01, method: test.method, n: test.n };
    }
  }
  return {
    dataset: results.dataset,
    n: ensembleRuns.length,
    bestSingleId: best?.id ?? null,
    rows,
    spentUsd,
    spentIncomplete,
    ...retrySpend([...ensembleRuns, ...referenceRuns]),
    ...(referencePending ? { referencePending } : {}),
  };
}

/** Classify a stored error: HTTP 402 is out of credit, a content filter or refusal is a refusal. */
export function referenceFailureReason(error: string | undefined): ReferenceFailureReason {
  if (!error) return 'other';
  if (/\b402\b|more credits/i.test(error)) return 'out-of-credit';
  if (/content_filter|refusal/i.test(error)) return 'refused';
  return 'other';
}

function referenceFailureReasons(runs: PromptRunResult[], key: string): ReferencePending['reasons'] {
  const counts = new Map<ReferenceFailureReason, number>();
  for (const run of runs) {
    if (!run.evaluation?.results?.[key]?.failure) continue;
    const error = run.failure === 'timeout' ? undefined : run.responses.find((r) => r.error)?.error;
    const reason = referenceFailureReason(error);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const order: ReferenceFailureReason[] = ['out-of-credit', 'refused', 'other'];
  return order.filter((reason) => counts.has(reason)).map((reason) => ({ reason, count: counts.get(reason)! }));
}

function retrySpend(runs: PromptRunResult[]): Pick<DatasetSummary, 'retrySpendUsd'> {
  const usd = runs.reduce((sum, run) => sum + (run.priorAttemptCostUsd ?? 0), 0);
  return usd > 0 ? { retrySpendUsd: usd } : {};
}

function methodOf(config: MatrixConfig): MatrixSummary['method'] {
  const plain = ({ id, label, spec }: { id: string; label: string; spec: string }) => ({ id, label, spec });
  return {
    matrix: config.name,
    description: config.description,
    datasets: config.datasets,
    sample: config.sample,
    questionSeed: config.questionSeed,
    optionSeed: config.optionSeed,
    protocol: config.protocol,
    temperature: config.temperature,
    confidence: 0.95,
    models: config.models.map(plain),
    summarizer: config.summarizer.id,
    strategies: config.ensembleStrategies,
    reference: plain(config.reference),
  };
}

/**
 * The copy of a summary the app publishes. For a pending reference it keeps
 * only how many questions were answered: the page shows the reference as
 * coming soon, and the failure counts and reasons stay in the run's own
 * summary.json.
 */
export function forPublication(summary: MatrixSummary): MatrixSummary {
  return {
    ...summary,
    datasets: summary.datasets.map((d) => {
      if (!d.referencePending) return d;
      return { ...d, referencePending: { answered: d.referencePending.answered } };
    }),
  };
}

/** A summary with no results: the page shows the method and "not run yet". */
export function notRunSummary(
  config: MatrixConfig,
  estimate: MatrixEstimate | null,
  now: Date,
): MatrixSummary {
  return {
    schemaVersion: 1,
    status: 'not-run',
    runId: null,
    mode: 'free',
    generatedAt: now.toISOString(),
    method: methodOf(config),
    estimate: estimate ? { lowUsd: estimate.lowUsd, highUsd: estimate.highUsd, calls: estimate.calls } : null,
    totalCostUsd: null,
    totalCostIncomplete: false,
    datasets: [],
  };
}

/** Summary of a run from the results of every dataset. */
export function summarizeMatrix(
  config: MatrixConfig,
  results: DatasetResults[],
  info: { runId: string; mode: 'mock' | 'free'; estimate: MatrixEstimate | null; now: Date },
): MatrixSummary {
  const datasets = results.map((r) => summarizeDataset(config, r));
  const complete = results.every(
    (r) => r.ensemble && r.reference && r.ensemble.runs.length >= r.ensemble.sampleSize
      && r.reference.runs.length >= r.reference.sampleSize,
  ) && results.length === config.datasets.length;
  const totalCostUsd = datasets.reduce((sum, d) => sum + d.spentUsd, 0);
  return {
    ...notRunSummary(config, info.estimate, info.now),
    status: complete ? 'complete' : 'partial',
    runId: info.runId,
    mode: info.mode,
    totalCostUsd,
    totalCostIncomplete: datasets.some((d) => d.spentIncomplete),
    datasets,
  };
}
