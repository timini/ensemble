import { describe, expect, it } from "vitest";
import committed from "~/data/benchmark-summary.json";
import {
  datasetLabel,
  parseBenchmarkSummary,
  referencePending,
  shouldShowResults,
  toResultRows,
} from "../benchmarks";
import { complete } from "./benchmarkSummaryFixture";

const t = (key: string) => `t:${key}`;

describe("referencePending", () => {
  it("is false when every dataset has a reference row", () => {
    const withReference = {
      ...complete,
      datasets: complete.datasets.map((d) => ({
        ...d,
        rows: [
          ...d.rows,
          { ...d.rows[0]!, id: "reference", kind: "reference" as const },
        ],
      })),
    };
    expect(referencePending(withReference)).toBe(false);
    expect(referencePending(complete)).toBe(true);
  });
});

describe("parseBenchmarkSummary", () => {
  it("reads the committed summary", () => {
    const summary = parseBenchmarkSummary(committed);
    expect(summary).not.toBeNull();
    expect(summary!.method.models).toHaveLength(3);
  });

  it("publishes the free M3 run with every dataset and no reference score", () => {
    const summary = parseBenchmarkSummary(committed)!;
    expect(summary).toMatchObject({ status: "complete", mode: "free" });
    expect(summary.datasets.map((d) => d.dataset)).toEqual([
      "gsm8k",
      "mmlu_pro",
      "gpqa",
      "truthfulqa",
    ]);
    for (const dataset of summary.datasets) {
      expect(dataset.rows.map((r) => r.id)).toEqual([
        "single:qwen",
        "single:llama",
        "single:gemma",
        "ensemble:majority",
        "ensemble:standard",
      ]);
    }
    expect(referencePending(summary)).toBe(true);
    expect(shouldShowResults(summary, { NODE_ENV: "production" })).toBe(true);
  });

  it("publishes no reasons for the missing reference", () => {
    expect(JSON.stringify(committed)).not.toMatch(
      /credit|refus|billing|balance/i,
    );
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

describe("shouldShowResults", () => {
  const production = { NODE_ENV: "production" };

  it("shows a free-mode summary with results", () => {
    expect(shouldShowResults(complete, production)).toBe(true);
  });

  it("hides a not-run or empty summary", () => {
    expect(shouldShowResults(null, production)).toBe(false);
    expect(
      shouldShowResults({ ...complete, status: "not-run" }, production),
    ).toBe(false);
    expect(shouldShowResults({ ...complete, datasets: [] }, production)).toBe(
      false,
    );
  });

  it("shows a mock dry run in development only", () => {
    const mock = { ...complete, mode: "mock" as const };
    expect(shouldShowResults(mock, production)).toBe(false);
    expect(shouldShowResults(mock, { NODE_ENV: "test" })).toBe(false);
    expect(shouldShowResults(mock, { NODE_ENV: "development" })).toBe(true);
  });
});

describe("datasetLabel", () => {
  it("names the datasets the matrix uses", () => {
    expect(datasetLabel("mmlu_pro")).toBe("MMLU-Pro");
    expect(datasetLabel("other")).toBe("other");
  });
});
