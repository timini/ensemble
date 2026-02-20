/**
 * ResponsesSection — Renders AI responses, skeleton placeholders, and manual responses.
 * Extracted from the review page to keep page.tsx under 200 lines.
 */

"use client";

import { useTranslation } from "react-i18next";
import { formatModelLabelFromId } from "~/lib/providerModels";
import { ResponseCard } from "@/components/molecules/ResponseCard";
import { Button } from "@/components/atoms/Button";
import { MessageSquare } from "lucide-react";
import type { Provider } from "@/components/molecules/ResponseCard";
import { ResponseCardSkeleton } from "./ResponseCardSkeleton";

interface SelectedModel {
  id: string;
  model: string;
  provider: Provider;
}

interface StreamingResponse {
  modelId: string;
  model: string;
  provider: Provider;
  response: string;
  error?: string | null;
  isStreaming: boolean;
  responseTime?: number | null;
  tokenCount?: number | null;
}

interface ManualResponse {
  id: string;
  label: string;
  response: string;
}

interface ResponsesSectionProps {
  responses: StreamingResponse[];
  manualResponses: ManualResponse[];
  pendingModels: SelectedModel[];
  maxExpandedCards: number;
  onRetry: (modelId: string) => void;
  onBack: () => void;
}

export function ResponsesSection({
  responses,
  manualResponses,
  pendingModels,
  maxExpandedCards,
  onRetry,
  onBack,
}: ResponsesSectionProps) {
  const { t } = useTranslation();

  const isEmpty =
    responses.length === 0 &&
    pendingModels.length === 0 &&
    manualResponses.length === 0;

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-xl font-semibold">
        {t("pages.review.responsesHeading")}
      </h3>

      {isEmpty ? (
        <div
          className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center flex flex-col items-center"
          data-testid="empty-responses"
        >
          <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">
            {t("pages.review.noResponses")}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {t("pages.review.noResponsesHint")}
          </p>
          <Button variant="outline" onClick={onBack}>
            {t("pages.review.backButton")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {responses.map((response, index) => (
            <ResponseCard
              key={response.modelId}
              modelName={response.model}
              provider={response.provider}
              status={
                response.error
                  ? "error"
                  : response.isStreaming
                    ? "streaming"
                    : "complete"
              }
              responseType="ai"
              content={response.response}
              error={response.error ?? undefined}
              responseTime={
                response.responseTime
                  ? `${response.responseTime}ms`
                  : undefined
              }
              testId={`response-card-${response.modelId}`}
              tokenCount={response.tokenCount ?? undefined}
              onRetry={() => onRetry(response.modelId)}
              defaultExpanded={index < maxExpandedCards}
            />
          ))}
          {pendingModels.map((model) => (
            <ResponseCardSkeleton
              key={model.id}
              modelName={formatModelLabelFromId(model.model)}
              provider={model.provider}
              testId={`response-skeleton-${model.id}`}
            />
          ))}
          {manualResponses.map((manual) => (
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
      )}
    </div>
  );
}
