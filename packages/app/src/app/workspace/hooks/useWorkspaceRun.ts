import { useMemo } from "react";
import { PRICE_TABLE_DATE } from "@ensemble-ai/shared-utils/pricing";
import type { ConsensusAnswerProps } from "@/components/molecules/ConsensusAnswer";
import { useStore } from "~/store";
import { selectRunModels } from "~/store/slices/responseSlice";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { useRunCost } from "~/hooks/useRunCost";
import { useAgreementCalibration } from "~/hooks/useAgreementCalibration";
import { FALLBACK_MODELS } from "~/lib/models";
import { formatModelLabelFromId } from "~/lib/providerModels";
import { endpointModelName } from "~/lib/endpointModels";
import { ollamaEmbeddingPullCommand } from "~/lib/endpointStatus";
import { toMajorityVoteBreakdownProps } from "~/lib/majorityVote";
import {
  toAgreementProps,
  toAnswerItems,
  toConsensusStatus,
} from "~/lib/workspaceRun";
import { useRunState } from "./useRunState";
import { useRunAnalytics } from "./useRunAnalytics";
import { useStreamingResponses } from "./useStreamingResponses";
import { useResponseEmbeddings } from "./useResponseEmbeddings";
import { useConsensusGeneration } from "./useConsensusGeneration";
import { useConsensusTrigger } from "./useConsensusTrigger";
import { useConsensusStatus } from "./useConsensusStatus";
import { useModelRetry } from "./useModelRetry";
import { useAddManualAnswer } from "./useAddManualAnswer";

/**
 * The run on the workspace, wired from the M1 to M3 hooks: streaming,
 * embeddings and agreement, consensus and its trigger, retries, manual
 * answers and cost. Returns the props of the result components and the
 * actions the composer needs.
 */
export function useWorkspaceRun({
  onOpenSettings,
}: { onOpenSettings?: () => void } = {}) {
  const hasHydrated = useHasHydrated();
  const endpoints = useStore((state) => state.endpoints);
  const runModels = useStore(selectRunModels);
  const consensusMethod = useStore((state) => state.consensusMethod);
  const pullCommand = useStore((state) =>
    ollamaEmbeddingPullCommand(state.endpoints),
  );
  const run = useRunState(hasHydrated);
  const analytics = useRunAnalytics(
    run.viewResponses,
    run.viewManualResponses,
    run.viewAgreementStats,
    run.viewSimilarityMatrix,
    run.viewEmbeddings,
  );
  const { startRun, retryModel } = useStreamingResponses({ mode: run.mode });
  const embeddings = useResponseEmbeddings({
    hasHydrated,
    completedResponses: analytics.agreementAnswers,
    embeddingsProvider: run.embeddingsProvider,
    viewEmbeddings: run.viewEmbeddings,
    viewEmbeddingsSource: run.viewEmbeddingsSource,
    viewSimilarityMatrix: run.viewSimilarityMatrix,
    mode: run.mode,
    setEmbeddings: run.setEmbeddings,
    calculateAgreementState: run.calculateAgreement,
  });
  const consensus = useConsensusGeneration();
  const retry = useModelRetry(retryModel, consensus.restart);
  const addManualAnswer = useAddManualAnswer(consensus.restart);
  useConsensusTrigger({
    hasHydrated,
    responses: run.viewResponses,
    manualResponses: run.viewManualResponses,
    metaAnalysis: run.metaAnalysis,
    summarizerModel: run.summarizerModel,
    selectedModels: run.selectedModels,
    prompt: run.prompt,
    generateConsensus: consensus.generateConsensus,
    isGenerating: consensus.isGenerating,
    error: consensus.error,
  });
  const consensusStatus = useConsensusStatus({
    hasHydrated,
    responses: run.viewResponses,
    manualCount: run.viewManualResponses.length,
    metaAnalysis: run.viewMetaAnalysis,
    isGenerating: consensus.isGenerating,
    error: consensus.error,
  });
  const runCost = useRunCost(
    run.viewResponses,
    run.viewEmbeddings,
    run.viewEmbeddingsSource,
  );
  const calibration = useAgreementCalibration(
    run.viewEmbeddingsSource ?? run.embeddingsProvider,
  );

  const summarizerName = useMemo(() => {
    const id = run.summarizerModel ?? runModels[0]?.model;
    if (!id) return undefined;
    if (id.includes("/")) return endpointModelName(id, endpoints);
    return (
      FALLBACK_MODELS.find((m) => m.id === id)?.name ??
      formatModelLabelFromId(id)
    );
  }, [run.summarizerModel, runModels, endpoints]);

  const hasRun = hasHydrated && run.prompt !== null;
  const total = run.viewResponses.length + run.viewManualResponses.length;
  const done =
    run.viewResponses.filter((r) => !r.isStreaming).length +
    run.viewManualResponses.length;
  const status = toConsensusStatus(consensusStatus);

  const consensusProps: ConsensusAnswerProps = {
    status,
    method: consensusMethod,
    summarizerName,
    text: run.viewMetaAnalysis ?? undefined,
    error: consensus.error ?? undefined,
    onRetry: consensus.restart,
    majorityVote:
      run.viewMajorityVote && status === "success"
        ? toMajorityVoteBreakdownProps(run.viewMajorityVote)
        : undefined,
    cost: runCost
      ? {
          variant: "actual",
          callCount: runCost.callCount,
          totalUsd: runCost.totalUsd,
          estimated: runCost.estimated,
          unpricedModels: runCost.unpricedModels,
          pricedCallCount: runCost.pricedCallCount,
          unpricedCallCount: runCost.unpricedCallCount,
          localCallCount: runCost.localCallCount,
          priceDate: PRICE_TABLE_DATE,
        }
      : undefined,
  };

  return {
    hasRun,
    prompt: run.prompt,
    running: run.viewResponses.some((r) => r.isStreaming),
    /** Starts a run of the current ensemble, dropping any consensus still running for the old one. */
    startRun: (prompt: string) => {
      consensus.restart();
      startRun(prompt);
    },
    addManualAnswer,
    agreement: toAgreementProps({
      embeddings: embeddings.status,
      finished: analytics.allFinished,
      total,
      done,
      scorable: analytics.agreementAnswers.length,
      overall: analytics.overallAgreement,
      comparisons: analytics.pairwiseComparisons,
      excluded: embeddings.excludedModels,
      calibration,
      pullCommand,
      onOpenSettings,
    }),
    consensus: consensusProps,
    answers: toAnswerItems({
      responses: run.viewResponses,
      manualResponses: run.viewManualResponses,
      runModels: hasHydrated ? runModels : [],
      endpoints,
      onRetry: retry,
    }),
    exclusion: {
      succeeded: analytics.completedResponses.length,
      total: run.viewResponses.length,
      failedModels: analytics.failedModels,
      manualCount: run.viewManualResponses.length,
      finished: analytics.allFinished,
      agreementAvailable: embeddings.status !== "unavailable",
    },
  };
}
