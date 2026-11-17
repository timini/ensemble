"use client";

import { useTranslation } from "react-i18next";
import {
  AgreementAnalysis,
  type AgreementCalibrationInfo,
  type AgreementLevelThresholds,
  type PairwiseComparison,
} from "@/components/organisms/AgreementAnalysis";
import { InlineAlert } from "@/components/atoms/InlineAlert";
import { CommandSnippet } from "@/components/atoms/CommandSnippet";
import type { EmbeddingsStatus } from "../hooks/useResponseEmbeddings";

export interface AgreementSectionProps {
  /** Embeddings state from useResponseEmbeddings. */
  status: EmbeddingsStatus;
  overallAgreement: number;
  pairwiseComparisons: PairwiseComparison[];
  /** Number of completed answers. */
  responseCount: number;
  averageConfidence: number;
  /** Answers left out of the score because their embedding failed. */
  excludedModels?: string[];
  /**
   * Shown when there is no score because a connected Ollama has no
   * embedding model: the exact command that installs one.
   */
  ollamaPullCommand?: string;
  /** Label cut-offs for the embedding model in use (see lib/agreementCalibration.ts). */
  levelThresholds?: AgreementLevelThresholds;
  /** Whether those cut-offs are calibrated; shown with the analysis. */
  calibration?: AgreementCalibrationInfo;
}

/**
 * Agreement block on the review page. Shows the analysis only when real
 * embeddings exist; otherwise explains why there is no score.
 */
export function AgreementSection({
  status,
  overallAgreement,
  pairwiseComparisons,
  responseCount,
  averageConfidence,
  excludedModels = [],
  ollamaPullCommand,
  levelThresholds,
  calibration,
}: AgreementSectionProps) {
  const { t } = useTranslation();

  if (responseCount < 2) return null;

  // Ready but nothing to compare: the vectors could not be scored (for
  // example a zero vector or mismatched sizes). Say so instead of a blank.
  const effectiveStatus =
    status === "ready" && pairwiseComparisons.length === 0 ? "error" : status;

  if (effectiveStatus === "unavailable" || effectiveStatus === "error") {
    const key =
      effectiveStatus === "unavailable"
        ? "agreementUnavailable"
        : "agreementError";
    return (
      <div
        className="mt-8"
        data-testid={
          effectiveStatus === "unavailable"
            ? "agreement-unavailable"
            : "agreement-embeddings-error"
        }
      >
        <InlineAlert variant="warning">
          <p className="font-semibold">{t(`pages.review.${key}Title`)}</p>
          <p className="mt-1">{t(`pages.review.${key}Description`)}</p>
          {effectiveStatus === "unavailable" && ollamaPullCommand && (
            <div className="mt-2 space-y-2">
              <p>{t("pages.review.agreementOllamaPull")}</p>
              <CommandSnippet
                command={ollamaPullCommand}
                data-testid="agreement-ollama-pull"
              />
            </div>
          )}
        </InlineAlert>
      </div>
    );
  }

  if (effectiveStatus !== "ready") return null;

  return (
    <div className="mt-8">
      {excludedModels.length > 0 && (
        <div className="mb-4" data-testid="agreement-partial-note">
          <InlineAlert variant="info">
            {t("pages.review.agreementPartialNote", {
              models: excludedModels.join(", "),
            })}
          </InlineAlert>
        </div>
      )}
      <AgreementAnalysis
        overallAgreement={overallAgreement}
        pairwiseComparisons={pairwiseComparisons}
        responseCount={responseCount}
        comparisonCount={pairwiseComparisons.length}
        averageConfidence={averageConfidence}
        levelThresholds={levelThresholds}
        calibration={calibration}
      />
    </div>
  );
}
