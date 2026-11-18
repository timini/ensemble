import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import i18n from "~/lib/i18n";
import type { BenchmarkSummary } from "~/lib/benchmarks";
import { complete } from "~/lib/__tests__/benchmarkSummaryFixture";

const holder = vi.hoisted(() => ({ summary: null as unknown }));

vi.mock("~/data/benchmark-summary.json", () => ({
  get default() {
    return holder.summary;
  },
}));

import BenchmarksPage from "../page";

const gpqa = {
  ...complete.datasets[0]!,
  dataset: "gpqa",
  n: 198,
};

function show(summary: BenchmarkSummary) {
  holder.summary = summary;
  render(<BenchmarksPage />);
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await i18n.changeLanguage("en");
});

describe("BenchmarksPage", () => {
  it("shows one table per dataset with the best single model and p-values", () => {
    show({ ...complete, datasets: [complete.datasets[0]!, gpqa] });
    const tables = screen.getAllByTestId("benchmark-results-table");
    expect(tables).toHaveLength(2);
    expect(screen.queryByTestId("benchmarks-not-run")).not.toBeInTheDocument();

    const rows = within(tables[0]!).getAllByTestId("benchmark-result-row");
    expect(rows[0]).toHaveAttribute("data-best", "true");
    expect(rows[1]).toHaveAttribute("data-best", "false");
    const pCells = within(tables[0]!).getAllByTestId("benchmark-result-p");
    expect(pCells[0]).toHaveTextContent(/best/i);
    expect(pCells[1]).toHaveTextContent("0.300");
    expect(within(tables[0]!).getAllByTestId("accuracy-interval")).toHaveLength(
      2,
    );
    expect(screen.getByTestId("benchmarks-run-info")).toHaveTextContent(
      "$9.50",
    );
    expect(
      screen.queryByTestId("benchmarks-mock-notice"),
    ).not.toBeInTheDocument();
  });

  it("formats the run cost in the reader's language", async () => {
    await i18n.changeLanguage("fr");
    show(complete);
    const usd = new Intl.NumberFormat("fr", {
      style: "currency",
      currency: "USD",
    })
      .format(9.5)
      .replace(/\s/g, " ");
    expect(screen.getByTestId("benchmarks-run-info")).toHaveTextContent(usd);
  });

  it("flags a dataset below 200 questions", () => {
    show({ ...complete, datasets: [complete.datasets[0]!, gpqa] });
    const notes = screen.getAllByTestId("benchmarks-small-sample");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent("GPQA has 198 questions");
  });

  it("shows an incomplete total as a lower bound and a partial run notice", () => {
    show({ ...complete, status: "partial", totalCostIncomplete: true });
    expect(screen.getByTestId("benchmarks-run-info")).toHaveTextContent(
      "at least $9.50",
    );
    expect(screen.getByTestId("benchmarks-partial-notice")).toBeVisible();
  });

  it("shows a mock dry run with a warning in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    show({ ...complete, mode: "mock" });
    expect(screen.getByTestId("benchmarks-mock-notice")).toBeVisible();
    expect(screen.getAllByTestId("benchmark-results-table")).toHaveLength(1);
  });

  it("treats a mock dry run as not run outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    show({ ...complete, mode: "mock" });
    expect(screen.getByTestId("benchmarks-not-run")).toBeVisible();
    expect(
      screen.queryByTestId("benchmark-results-table"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("accuracy-interval")).not.toBeInTheDocument();
  });

  it("shows a reference with no results as coming soon and the agreement score as uncalibrated", () => {
    show(complete);
    expect(
      screen.getByTestId("benchmarks-reference-pending"),
    ).toHaveTextContent(
      "Premium reference (Claude Sonnet 5.5): Coming soon. A comparison with a premium model will be added.",
    );
    expect(screen.getByTestId("benchmark-method-reference")).toHaveTextContent(
      "Coming soon",
    );
    expect(
      screen.getByTestId("benchmarks-agreement-uncalibrated"),
    ).toHaveTextContent("uncalibrated");
    expect(screen.getByTestId("benchmarks-page")).not.toHaveTextContent(
      /credit|not run|failed to run/i,
    );
  });

  it("shows the reference as coming soon in French", async () => {
    await i18n.changeLanguage("fr");
    show(complete);
    expect(
      screen.getByTestId("benchmarks-reference-pending"),
    ).toHaveTextContent("Bientôt disponible");
  });

  it("has no coming-soon note when every dataset has a reference row", () => {
    const dataset = complete.datasets[0]!;
    show({
      ...complete,
      datasets: [
        {
          ...dataset,
          rows: [
            ...dataset.rows,
            { ...dataset.rows[0]!, id: "reference", kind: "reference" },
          ],
        },
      ],
    });
    expect(
      screen.queryByTestId("benchmarks-reference-pending"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("benchmark-method-reference")).toHaveTextContent(
      "run once and cached",
    );
  });

  it("shows not run yet for a not-run summary", () => {
    show({ ...complete, status: "not-run", datasets: [] });
    expect(screen.getByTestId("benchmarks-not-run")).toBeVisible();
    expect(screen.getByTestId("benchmark-method")).toBeVisible();
  });
});
