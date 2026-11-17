/**
 * Benchmarks Page
 *
 * Accuracy of single models, ensembles and a premium reference on public
 * benchmarks, from the committed summary of the benchmark matrix
 * (src/data/benchmark-summary.json). With no results committed it says so
 * and shows the method; it never shows placeholder numbers. A mock dry-run
 * summary is shown in development only, with a warning.
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
  MIN_SAMPLE,
  parseBenchmarkSummary,
  shouldShowResults,
  toResultRows,
  type BenchmarkSummary,
} from "~/lib/benchmarks";

function Results({ summary }: { summary: BenchmarkSummary }) {
  const { t, i18n } = useTranslation("common");
  const date = new Date(summary.generatedAt).toLocaleDateString(i18n.language);
  const total = `$${(summary.totalCostUsd ?? 0).toFixed(2)}`;
  return (
    <section className="mt-8 space-y-6" data-testid="benchmarks-results">
      <Heading level={2} size="xl">
        {t("pages.benchmarks.resultsHeading")}
      </Heading>
      <Text color="muted" data-testid="benchmarks-run-info">
        {t("pages.benchmarks.runInfo", {
          runId: summary.runId ?? "",
          date,
          cost: summary.totalCostIncomplete
            ? t("pages.benchmarks.costAtLeast", { cost: total })
            : total,
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
        <div key={dataset.dataset} className="space-y-2">
          <BenchmarkResultsTable
            title={datasetLabel(dataset.dataset)}
            n={dataset.n}
            rows={toResultRows(dataset, t)}
          />
          {dataset.n < MIN_SAMPLE && (
            <Text
              variant="small"
              color="muted"
              data-testid="benchmarks-small-sample"
            >
              {t("pages.benchmarks.smallSampleNotice", {
                dataset: datasetLabel(dataset.dataset),
                n: dataset.n,
                min: MIN_SAMPLE,
              })}
            </Text>
          )}
        </div>
      ))}
    </section>
  );
}

export default function BenchmarksPage() {
  const { t } = useTranslation("common");
  const summary = parseBenchmarkSummary(summaryJson);
  const hasResults = shouldShowResults(summary, {
    NODE_ENV: process.env.NODE_ENV,
  });
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
