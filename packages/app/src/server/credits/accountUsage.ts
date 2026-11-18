import {
  computeRunCost,
  PRICE_TABLE,
  type CallUsage,
  type PriceTable,
} from "@ensemble-ai/shared-utils/pricing";

/** A settled run as stored in `usage/{uid}__{runId}`. */
export interface UsageRecord {
  runId: string;
  createdAtMs: number;
  chargedMicros: number;
  calls: CallUsage[];
}

/** One row of the recent runs list on /account. */
export interface RunSummary {
  runId: string;
  createdAtMs: number;
  chargedMicros: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  /** `provider/modelId`, each once, in the order of their first call. */
  models: string[];
}

/** Usage of one model over a set of runs (FR-041). */
export interface ModelUsage {
  /** `provider/modelId`. */
  model: string;
  runs: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** This model's share of what the runs were charged. */
  chargedMicros: number;
}

const modelOf = (c: CallUsage) => `${c.provider}/${c.modelId}`;

export function summarizeRun(record: UsageRecord): RunSummary {
  return {
    runId: record.runId,
    createdAtMs: record.createdAtMs,
    chargedMicros: record.chargedMicros,
    callCount: record.calls.length,
    inputTokens: record.calls.reduce((n, c) => n + c.inputTokens, 0),
    outputTokens: record.calls.reduce((n, c) => n + c.outputTokens, 0),
    models: [...new Set(record.calls.map(modelOf))],
  };
}

/**
 * Split a run's charge between its models in proportion to their model
 * cost (by call count when nothing in the run has a price). The last
 * model takes the rounding remainder, so the shares sum to the charge.
 */
function splitCharge(
  record: UsageRecord,
  table: PriceTable,
): { byModel: Map<string, CallUsage[]>; shares: Map<string, number> } {
  const byModel = new Map<string, CallUsage[]>();
  for (const c of record.calls) {
    byModel.set(modelOf(c), [...(byModel.get(modelOf(c)) ?? []), c]);
  }
  const weights = new Map<string, number>();
  for (const [model, calls] of byModel) {
    weights.set(model, computeRunCost(calls, table).totalUsd);
  }
  let total = [...weights.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) {
    for (const [model, calls] of byModel) weights.set(model, calls.length);
    total = record.calls.length;
  }
  const shares = new Map<string, number>();
  let given = 0;
  const models = [...byModel.keys()];
  models.forEach((model, i) => {
    const share =
      i === models.length - 1
        ? record.chargedMicros - given
        : Math.round(
            (record.chargedMicros * (weights.get(model) ?? 0)) / total,
          );
    shares.set(model, share);
    given += share;
  });
  return { byModel, shares };
}

/** Calls, tokens and charge per model over the given runs, largest charge first. */
export function usageByModel(
  records: readonly UsageRecord[],
  table: PriceTable = PRICE_TABLE,
): ModelUsage[] {
  const rows = new Map<string, ModelUsage>();
  for (const record of records) {
    const { byModel, shares } = splitCharge(record, table);
    for (const [model, calls] of byModel) {
      const row = rows.get(model) ?? {
        model,
        runs: 0,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        chargedMicros: 0,
      };
      row.runs += 1;
      row.calls += calls.length;
      row.inputTokens += calls.reduce((n, c) => n + c.inputTokens, 0);
      row.outputTokens += calls.reduce((n, c) => n + c.outputTokens, 0);
      row.chargedMicros += shares.get(model) ?? 0;
      rows.set(model, row);
    }
  }
  return [...rows.values()].sort(
    (a, b) => b.chargedMicros - a.chargedMicros || b.calls - a.calls,
  );
}
