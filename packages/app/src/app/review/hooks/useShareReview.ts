/**
 * Hook for sharing review results via tRPC.
 *
 * Creates a shared review on the server and returns
 * the share URL for the user to copy/share.
 */

import { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { useStore } from "~/store";
import type { ModelResponse, ManualResponse, AgreementStats } from "~/store";

interface PairwiseComparison {
  model1: string;
  model2: string;
  similarity: number;
  confidence: number;
}

interface UseShareReviewOptions {
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  consensusText: string | null;
  agreementStats: AgreementStats | null;
  overallAgreement: number;
  pairwiseComparisons: PairwiseComparison[];
}

export function useShareReview({
  responses,
  manualResponses,
  consensusText,
  agreementStats,
  overallAgreement,
  pairwiseComparisons,
}: UseShareReviewOptions) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const prompt = useStore((state) => state.prompt);
  const summarizerModel = useStore((state) => state.summarizerModel);

  const createShareMutation = api.share.create.useMutation();

  const handleShare = useCallback(async () => {
    if (!prompt) return;

    setDialogOpen(true);
    setIsSharing(true);
    setShareError(null);
    setShareUrl(null);

    try {
      const result = await createShareMutation.mutateAsync({
        prompt,
        responses: responses
          .filter((r) => r.isComplete && !r.error)
          .map((r) => ({
            modelId: r.modelId,
            provider: r.provider,
            model: r.model,
            response: r.response,
            responseTime: r.responseTime,
            tokenCount: r.tokenCount,
          })),
        manualResponses: manualResponses.map((m) => ({
          id: m.id,
          label: m.label,
          response: m.response,
        })),
        consensusText: consensusText ?? null,
        summarizerModel: summarizerModel ?? null,
        agreementStats: agreementStats ?? null,
        overallAgreement: overallAgreement ?? null,
        pairwiseComparisons,
      });

      const url = `${window.location.origin}/share/${result.shareId}`;
      setShareUrl(url);
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : "Failed to create share link",
      );
    } finally {
      setIsSharing(false);
    }
  }, [
    prompt,
    responses,
    manualResponses,
    consensusText,
    summarizerModel,
    agreementStats,
    overallAgreement,
    pairwiseComparisons,
    createShareMutation,
  ]);

  const handleCopyLink = useCallback(() => {
    if (shareUrl) {
      void navigator.clipboard.writeText(shareUrl);
    }
  }, [shareUrl]);

  return {
    shareUrl,
    isSharing,
    shareError,
    dialogOpen,
    setDialogOpen,
    handleShare,
    handleCopyLink,
  };
}
