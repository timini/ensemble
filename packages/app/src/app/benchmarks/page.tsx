/**
 * Benchmarks Page
 *
 * Accuracy of single models, ensembles and a premium reference on public
 * benchmarks, from the committed summary of the benchmark matrix
 * (src/data/benchmark-summary.json). With no results committed it says so
 * and shows the method; it never shows placeholder numbers.
 */

"use client";

import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/organisms/PageHero";
import { BenchmarkMethod } from "@/components/organisms/BenchmarkMethod";
import { BenchmarkResultsTable } from "@/components/organisms/BenchmarkResultsTable";
import { BenchmarksNotRun } from "@/components/molecules/BenchmarksNotRun";
import { InlineAlert } from "@/components/atoms/InlineAlert";
import { Heading } from "@/components/atoms/Heading";
import { Text } from "@/components/atoms/Text";
import summaryJson from "~/data/benchmark-summary.json";
import {
  BENCHMARK_COMMAND,
  BENCHMARKS_DOCS_URL,
  datasetLabel,
  parseBenchmarkSummary,
  toResultRows,
  type BenchmarkSummary,
} from "~/lib/benchmarks";

const summary = parseBenchmarkSummary(summaryJson);

function Results({ summary }: { summary: BenchmarkSummary }) {
  const { t, i18n } = useTranslation("common");
  const date = new Date(summary.generatedAt).toLocaleDateString(i18n.language);
  return (
    <section className="mt-8 space-y-6" data-testid="benchmarks-results">
      <Heading level={2} size="xl">
        {t("pages.benchmarks.resultsHeading")}
      </Heading>
      <Text color="muted" data-testid="benchmarks-run-info">
        {t("pages.benchmarks.runInfo", {
          runId: summary.runId ?? "",
          date,
          cost: `$${(summary.totalCostUsd ?? 0).toFixed(2)}`,
        })}
      </Text>
      {summary.mode === "mock" && (
        <InlineAlert variant="warning" data-testid="benchmarks-mock-notice">
          {t("pages.benchmarks.mockNotice")}
        </InlineAlert>
      )}
      {summary.status === "partial" && (
        <InlineAlert variant="info" data-testid="benchmarks-partial-notice">
          {t("pages.benchmarks.partialNotice")}
        </InlineAlert>
      )}
      {summary.datasets.map((dataset) => (
        <BenchmarkResultsTable
          key={dataset.dataset}
          title={datasetLabel(dataset.dataset)}
          n={dataset.n}
          rows={toResultRows(dataset, t)}
        />
      ))}
    </section>
  );
}

export default function BenchmarksPage() {
  const { t } = useTranslation("common");
  const hasResults =
    summary !== null &&
    summary.status !== "not-run" &&
    summary.datasets.length > 0;
  const method = summary?.method;
  const summarizer =
    method?.models.find((model) => model.id === method.summarizer)?.label ??
    method?.summarizer ??
    "";

  return (
    <div
      className="container mx-auto max-w-5xl px-4 py-8"
      data-testid="benchmarks-page"
    >
      <PageHero
        title={t("pages.benchmarks.title")}
        description={t("pages.benchmarks.description")}
      />

      {hasResults && summary ? (
        <Results summary={summary} />
      ) : (
        <BenchmarksNotRun
          className="mt-8"
          command={BENCHMARK_COMMAND}
          estimate={summary?.estimate ?? null}
        />
      )}

      {method && (
        <BenchmarkMethod
          className="mt-8"
          datasets={method.datasets.map(datasetLabel)}
          sample={method.sample}
          questionSeed={method.questionSeed}
          optionSeed={method.optionSeed}
          models={method.models}
          strategies={method.strategies}
          summarizer={summarizer}
          reference={method.reference}
          docsUrl={BENCHMARKS_DOCS_URL}
        />
      )}
    </div>
  );
}
