"use client";

import { useTranslation } from "react-i18next";
import {
  AgreementAnalysis,
  type PairwiseComparison,
} from "@/components/organisms/AgreementAnalysis";
import { InlineAlert } from "@/components/atoms/InlineAlert";
import type { EmbeddingsStatus } from "../hooks/useResponseEmbeddings";

export interface AgreementSectionProps {
  /** Embeddings state from useResponseEmbeddings. */
  status: EmbeddingsStatus;
  overallAgreement: number;
  pairwiseComparisons: PairwiseComparison[];
  /** Number of completed answers. */
  responseCount: number;
  averageConfidence: number;
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
}: AgreementSectionProps) {
  const { t } = useTranslation();

  if (responseCount < 2) return null;

  if (status === "unavailable" || status === "error") {
    const key =
      status === "unavailable" ? "agreementUnavailable" : "agreementError";
    return (
      <div
        className="mt-8"
        data-testid={
          status === "unavailable"
            ? "agreement-unavailable"
            : "agreement-embeddings-error"
        }
      >
        <InlineAlert variant="warning">
          <p className="font-semibold">{t(`pages.review.${key}Title`)}</p>
          <p className="mt-1">{t(`pages.review.${key}Description`)}</p>
        </InlineAlert>
      </div>
    );
  }

  if (status !== "ready" || pairwiseComparisons.length === 0) return null;

  return (
    <div className="mt-8">
      <AgreementAnalysis
        overallAgreement={overallAgreement}
        pairwiseComparisons={pairwiseComparisons}
        responseCount={responseCount}
        comparisonCount={pairwiseComparisons.length}
        averageConfidence={averageConfidence}
      />
    </div>
  );
}
