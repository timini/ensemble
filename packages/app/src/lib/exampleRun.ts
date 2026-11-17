/**
 * The recorded run on the landing page (src/data/example-run.json, written
 * by scripts/record-example-run.mjs from real OpenRouter calls), mapped to
 * the ExampleRun organism's props. The agreement score is worked out from
 * the recorded cosine similarities with the same mapping and thresholds as
 * the workspace, so the example shows what the workspace would.
 */
import {
  embeddingModelKey,
  normalizeSimilarity,
} from "@ensemble-ai/shared-utils/similarity";
import { agreementLevel } from "@/components/molecules/AgreementSummary";
import type { ExampleRunProps } from "@/components/organisms/ExampleRun";
import { formatUsd } from "@/components/molecules/RunCostSummary/runCostFormat";
import { agreementCalibrationFor } from "./agreementCalibration";

export interface RecordedRun {
  /** YYYY-MM-DD. */
  recordedAt: string;
  via: string;
  prompt: string;
  embeddingModel: string;
  /** Endpoint-qualified id of the summarizer. */
  summarizer: string;
  answers: Array<{
    modelId: string;
    name: string;
    text: string;
    seconds?: number;
  }>;
  /** Cosine similarity of every pair of answers, in answer order. */
  similarity: number[][];
  consensus: { text: string };
  calls: number;
  totalCost: number | null;
  /** Not a real run. */
  illustrative?: boolean;
}

function meanAgreement(matrix: number[][]): number {
  const pairs: number[] = [];
  matrix.forEach((row, i) =>
    row.forEach((value, j) => {
      if (j > i) pairs.push(normalizeSimilarity(value));
    }),
  );
  return pairs.reduce((sum, v) => sum + v, 0) / Math.max(1, pairs.length);
}

/** Props for ExampleRun, with the date and cost formatted for `language`. */
export function exampleRunProps(
  run: RecordedRun,
  language: string,
): ExampleRunProps {
  const { levelThresholds, calibration } = agreementCalibrationFor(
    embeddingModelKey("openrouter", run.embeddingModel),
  );
  const score = meanAgreement(run.similarity);
  // Day first in English too, as in the rest of the copy.
  const date = new Intl.DateTimeFormat(language === "en" ? "en-GB" : language, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${run.recordedAt}T12:00:00Z`));
  return {
    prompt: run.prompt,
    answers: run.answers.map((answer) => ({
      id: answer.modelId,
      name: answer.name,
      provider: "openai-compatible",
      modelId: answer.modelId,
      text: answer.text,
      seconds: answer.seconds,
    })),
    consensus: run.consensus.text,
    score,
    level: agreementLevel(score, levelThresholds),
    calibrated: calibration.calibrated,
    calls: run.calls,
    cost:
      run.totalCost === null ? undefined : formatUsd(run.totalCost, language),
    recordedOn: date,
    via: run.via,
    embeddingModel: run.embeddingModel,
    summarizer:
      run.answers.find((a) => a.modelId === run.summarizer)?.name ??
      run.summarizer,
    illustrative: run.illustrative ?? false,
  };
}
