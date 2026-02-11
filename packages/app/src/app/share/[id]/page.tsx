/**
 * Shared Review Page
 *
 * Read-only view of a shared ensemble review.
 * Fetches the review data from the server and displays it
 * in the same layout as the review page.
 */

"use client";

import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { api } from "~/trpc/react";
import {
  normalizeSimilarity,
  calculateAverageConfidence,
} from "~/lib/agreement";
import { PageHero } from "@/components/organisms/PageHero";
import { ResponseCard } from "@/components/molecules/ResponseCard";
import { ConsensusCard } from "@/components/organisms/ConsensusCard";
import { AgreementAnalysis } from "@/components/organisms/AgreementAnalysis";
import { PromptCard } from "@/components/organisms/PromptCard";
import { LoadingSpinner } from "@/components/atoms/LoadingSpinner";
import type { Provider } from "@/components/molecules/ResponseCard";

export default function SharedReviewPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const shareId = params.id;

  const { data, isLoading, error } = api.share.getById.useQuery(
    { shareId },
    { enabled: !!shareId },
  );

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <h2 className="mb-2 text-2xl font-semibold text-foreground">
            {t("pages.share.notFoundTitle", "Review Not Found")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "pages.share.notFoundDescription",
              "This shared review may have been removed or the link is invalid.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const pairwiseComparisons = data.pairwiseComparisons.map((pc) => ({
    model1: pc.model1,
    model2: pc.model2,
    similarity: normalizeSimilarity(pc.similarity),
    confidence: pc.confidence,
  }));

  const overallAgreement = data.agreementStats
    ? normalizeSimilarity(data.agreementStats.mean)
    : 0;

  const averageConfidence = calculateAverageConfidence(pairwiseComparisons);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHero
        title={t("pages.share.title", "Shared Review")}
        description={t(
          "pages.share.description",
          "Ensemble AI review shared on {{date}}",
          { date: new Date(data.createdAt).toLocaleDateString() },
        )}
      />

      {/* Prompt */}
      <div className="mt-8">
        <PromptCard prompt={data.prompt} />
      </div>

      {/* Consensus */}
      {data.consensusText && (
        <div className="mt-8">
          <ConsensusCard
            summarizerModel={data.summarizerModel ?? "AI Model"}
            consensusText={data.consensusText}
          />
        </div>
      )}

      {/* Agreement Analysis */}
      {pairwiseComparisons.length > 0 && (
        <div className="mt-8">
          <AgreementAnalysis
            overallAgreement={overallAgreement}
            pairwiseComparisons={pairwiseComparisons}
            responseCount={data.responses.length}
            comparisonCount={pairwiseComparisons.length}
            averageConfidence={averageConfidence}
          />
        </div>
      )}

      {/* Individual Responses */}
      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold">
          {t("pages.review.responsesHeading")}
        </h3>

        <div className="space-y-4">
          {data.responses.map((response) => (
            <ResponseCard
              key={response.modelId}
              modelName={response.model}
              provider={response.provider as Provider}
              status="complete"
              responseType="ai"
              content={response.response}
              responseTime={
                response.responseTime ? `${response.responseTime}ms` : undefined
              }
              tokenCount={response.tokenCount ?? undefined}
              testId={`response-card-${response.modelId}`}
            />
          ))}
          {data.manualResponses.map((manual) => (
            <ResponseCard
              key={manual.id}
              modelName={manual.label}
              status="complete"
              responseType="manual"
              content={manual.response}
              defaultExpanded={false}
              testId={`manual-response-card-${manual.id}`}
            />
          ))}
        </div>
      </div>

      {/* Attribution footer */}
      <div className="mt-12 border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            "pages.share.poweredBy",
            "Powered by Ensemble AI — The smartest AI is an ensemble.",
          )}
        </p>
      </div>
    </div>
  );
}
