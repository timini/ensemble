import { describe, expect, it } from "vitest";
import committed from "~/data/benchmark-summary.json";
import {
  datasetLabel,
  parseBenchmarkSummary,
  toResultRows,
  type BenchmarkSummary,
} from "../benchmarks";

const t = (key: string) => `t:${key}`;

const method = (committed as { method: BenchmarkSummary["method"] }).method;

const complete: BenchmarkSummary = {
  schemaVersion: 1,
  status: "complete",
  runId: "r1",
  mode: "free",
  generatedAt: "2026-11-20T10:00:00.000Z",
  method,
  estimate: { lowUsd: 2, highUsd: 18, calls: 3990 },
  totalCostUsd: 9.5,
  datasets: [
    {
      dataset: "gsm8k",
      n: 200,
      bestSingleId: "single:qwen",
      spentUsd: 3,
      rows: [
        {
          id: "single:qwen",
          kind: "single",
          label: "Qwen3.5 9B",
          models: [],
          n: 200,
          correct: 150,
          accuracy: 0.75,
          ciLower: 0.69,
          ciUpper: 0.8,
          failures: 0,
          vsBestSingle: null,
          costUsd: 0.1,
          costIncomplete: false,
        },
        {
          id: "ensemble:majority",
          kind: "ensemble",
          label: "Ensemble, mechanical majority",
          strategy: "majority",
          models: [],
          n: 200,
          correct: 155,
          accuracy: 0.775,
          ciLower: 0.71,
          ciUpper: 0.83,
          failures: 1,
          vsBestSingle: {
            pValue: 0.3,
            n10: 2,
            n01: 7,
            method: "exact",
            n: 200,
          },
          costUsd: 0.3,
          costIncomplete: false,
        },
      ],
    },
  ],
};

describe("parseBenchmarkSummary", () => {
  it("reads the committed summary", () => {
    const summary = parseBenchmarkSummary(committed);
    expect(summary).not.toBeNull();
    expect(summary!.method.models).toHaveLength(3);
  });

  it("keeps a complete summary", () => {
    expect(parseBenchmarkSummary(complete)?.datasets[0]?.rows).toHaveLength(2);
  });

  it("rejects anything that is not a version 1 summary", () => {
    expect(parseBenchmarkSummary(null)).toBeNull();
    expect(parseBenchmarkSummary({ ...complete, schemaVersion: 2 })).toBeNull();
    expect(parseBenchmarkSummary({ ...complete, status: "done" })).toBeNull();
    expect(
      parseBenchmarkSummary({
        ...complete,
        datasets: [{ dataset: "x", rows: [{ id: 1 }] }],
      }),
    ).toBeNull();
    expect(
      parseBenchmarkSummary({ ...complete, method: undefined }),
    ).toBeNull();
  });
});

describe("toResultRows", () => {
  it("marks the best single model, translates ensemble labels and keeps the p-values", () => {
    const rows = toResultRows(complete.datasets[0]!, t);
    expect(rows[0]).toMatchObject({
      id: "single:qwen",
      label: "Qwen3.5 9B",
      isBest: true,
      pValue: null,
    });
    expect(rows[1]).toMatchObject({
      label: "t:pages.benchmarks.rowLabel.majority",
      isBest: false,
      pValue: 0.3,
      failures: 1,
    });
  });
});

describe("datasetLabel", () => {
  it("names the datasets the matrix uses", () => {
    expect(datasetLabel("mmlu_pro")).toBe("MMLU-Pro");
    expect(datasetLabel("other")).toBe("other");
  });
});
