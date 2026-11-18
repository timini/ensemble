/**
 * The benchmark results summary the /benchmarks page shows. It is written
 * by `npm run bench:matrix --workspace=packages/eval -- --publish` into
 * src/data/benchmark-summary.json; the format is described in
 * packages/eval/docs/BENCHMARKS.md. Anything that does not parse is shown as
 * "not run yet", never as numbers, and so is a mock dry run outside
 * development.
 */
import type { BenchmarkResultRow } from "@/components/organisms/BenchmarkResultsTable";

export const BENCHMARKS_DOCS_URL =
  "https://github.com/timini/ensemble/blob/main/packages/eval/docs/BENCHMARKS.md";
export const BENCHMARK_COMMAND =
  "npm run bench:matrix --workspace=packages/eval";
/** Fewest questions per dataset before an accuracy claim (PRODUCT_VISION). */
export const MIN_SAMPLE = 200;

export interface SummaryRow {
  id: string;
  kind: "single" | "ensemble" | "reference";
  label: string;
  models: string[];
  strategy?: string;
  n: number;
  correct: number;
  accuracy: number;
  ciLower: number;
  ciUpper: number;
  failures: number;
  vsBestSingle: {
    pValue: number;
    n10: number;
    n01: number;
    method: string;
    n: number;
  } | null;
  costUsd: number;
  costIncomplete: boolean;
}

export interface DatasetSummary {
  dataset: string;
  n: number;
  bestSingleId: string | null;
  rows: SummaryRow[];
  /** Cost of this dataset's results, cached reference answers included. */
  spentUsd: number;
  spentIncomplete?: boolean;
  /**
   * Set when the reference has no usable result on this dataset; its row is
   * then absent and the page shows the reference as coming soon.
   */
  referencePending?: { answered: number };
}

interface MethodModel {
  id: string;
  label: string;
  spec: string;
}

export interface BenchmarkSummary {
  schemaVersion: 1;
  status: "not-run" | "partial" | "complete";
  runId: string | null;
  mode: "mock" | "free";
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
    confidence: number;
    models: MethodModel[];
    summarizer: string;
    strategies: string[];
    reference: MethodModel;
  };
  estimate: { lowUsd: number; highUsd: number; calls: number } | null;
  /** Cost of the results, cached reference answers included. */
  totalCostUsd: number | null;
  /** Some calls had no price, so totalCostUsd is a lower bound. */
  totalCostIncomplete?: boolean;
  datasets: DatasetSummary[];
}

const DATASET_LABELS: Record<string, string> = {
  gsm8k: "GSM8K",
  mmlu_pro: "MMLU-Pro",
  gpqa: "GPQA",
  truthfulqa: "TruthfulQA",
};

/** Display name of a dataset id. */
export function datasetLabel(id: string): string {
  return DATASET_LABELS[id] ?? id;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function validRow(row: unknown): boolean {
  if (!isObject(row)) return false;
  return (
    typeof row.id === "string" &&
    ["single", "ensemble", "reference"].includes(row.kind as string) &&
    typeof row.label === "string" &&
    ["n", "accuracy", "ciLower", "ciUpper", "costUsd", "failures"].every((k) =>
      isNumber(row[k]),
    ) &&
    (row.vsBestSingle === null ||
      (isObject(row.vsBestSingle) && isNumber(row.vsBestSingle.pValue)))
  );
}

function validMethod(method: unknown): boolean {
  return (
    isObject(method) &&
    Array.isArray(method.datasets) &&
    Array.isArray(method.models) &&
    Array.isArray(method.strategies) &&
    isObject(method.reference) &&
    isNumber(method.sample)
  );
}

/** The summary if it is a valid version 1 summary, otherwise null. */
export function parseBenchmarkSummary(raw: unknown): BenchmarkSummary | null {
  if (!isObject(raw) || raw.schemaVersion !== 1) return null;
  if (!["not-run", "partial", "complete"].includes(raw.status as string))
    return null;
  if (!validMethod(raw.method) || !Array.isArray(raw.datasets)) return null;
  const datasetsValid = raw.datasets.every(
    (d) =>
      isObject(d) &&
      typeof d.dataset === "string" &&
      Array.isArray(d.rows) &&
      d.rows.every(validRow),
  );
  return datasetsValid ? (raw as unknown as BenchmarkSummary) : null;
}

/**
 * True when the page should show the summary's numbers: it has results, and
 * it is not a mock dry run (those are shown in development only).
 */
export function shouldShowResults(
  summary: BenchmarkSummary | null,
  env: { NODE_ENV?: string },
): boolean {
  if (!summary || summary.status === "not-run" || summary.datasets.length === 0)
    return false;
  return summary.mode !== "mock" || env.NODE_ENV === "development";
}

/**
 * True when the summary has results but the reference has no row on some
 * dataset: the page shows the reference as coming soon instead of a score.
 */
export function referencePending(summary: BenchmarkSummary): boolean {
  return summary.datasets.some(
    (d) =>
      d.referencePending !== undefined ||
      !d.rows.some((row) => row.kind === "reference"),
  );
}

/** Rows for BenchmarkResultsTable. Ensemble labels are translated; model names are not. */
export function toResultRows(
  dataset: DatasetSummary,
  t: (key: string) => string,
): BenchmarkResultRow[] {
  return dataset.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label:
      row.kind === "ensemble" && row.strategy
        ? t(`pages.benchmarks.rowLabel.${row.strategy}`)
        : row.label,
    accuracy: row.accuracy,
    ciLower: row.ciLower,
    ciUpper: row.ciUpper,
    pValue: row.vsBestSingle?.pValue ?? null,
    isBest: row.id === dataset.bestSingleId,
    costUsd: row.costUsd,
    costIncomplete: row.costIncomplete,
    failures: row.failures,
  }));
}
