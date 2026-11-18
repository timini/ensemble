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
import {
  useAddManualAnswer,
  useRemoveManualAnswer,
} from "./useAddManualAnswer";
import { embeddingModelKey } from "~/lib/runCost";
import { summarizerOrFallback } from "~/lib/summarizerChoice";

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
  const liveMethod = useStore((state) => state.consensusMethod);
  const clearManualResponses = useStore((s) => s.clearManualResponses);
  // A run reopened from history is read only and keeps its own settings.
  const historyView = useStore((state) => state.historyView);
  const readOnly = historyView !== null;
  const pullCommand = useStore((state) =>
    ollamaEmbeddingPullCommand(state.endpoints),
  );
  const run = useRunState(hasHydrated);
  // The consensus on screen keeps the settings it was made with, though
  // the composer may have changed since.
  const shownSettings = historyView ?? run.consensusSettings;
  const consensusMethod = shownSettings?.consensusMethod ?? liveMethod;
  const analytics = useRunAnalytics(
    run.viewResponses,
    run.viewManualResponses,
    run.viewAgreementStats,
    run.viewSimilarityMatrix,
    run.viewEmbeddings,
  );
  const { startRun, retryModel, stop } = useStreamingResponses({
    mode: run.mode,
  });
  const embeddings = useResponseEmbeddings({
    hasHydrated,
    completedResponses: analytics.agreementAnswers,
    embeddingsProvider: run.embeddingsProvider,
    embeddingsModel: embeddingModelKey(run.embeddingsProvider, endpoints),
    viewEmbeddings: run.viewEmbeddings,
    viewEmbeddingsSource: run.viewEmbeddingsSource,
    // Stores from before the model was kept: OpenAI and Google have one
    // embedding model each, an endpoint's is unknown and is embedded again.
    viewEmbeddingsModel:
      run.viewEmbeddingsModel ?? embeddingModelKey(run.viewEmbeddingsSource),
    viewSimilarityMatrix: run.viewSimilarityMatrix,
    mode: run.mode,
    setEmbeddings: run.setEmbeddings,
    calculateAgreementState: run.calculateAgreement,
    readOnly,
  });
  const consensus = useConsensusGeneration();
  const retry = useModelRetry(retryModel, consensus.restart);
  const addManualAnswer = useAddManualAnswer(consensus.restart);
  const removeManualAnswer = useRemoveManualAnswer(consensus.restart);
  useConsensusTrigger({
    hasHydrated: hasHydrated && !readOnly,
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
    readOnly,
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
    const chosen = shownSettings
      ? shownSettings.summarizerModel
      : run.summarizerModel;
    const id = summarizerOrFallback(chosen, runModels[0]?.model);
    if (!id) return undefined;
    if (id.includes("/")) return endpointModelName(id, endpoints);
    return (
      FALLBACK_MODELS.find((m) => m.id === id)?.name ??
      formatModelLabelFromId(id)
    );
  }, [shownSettings, run.summarizerModel, runModels, endpoints]);

  const hasRun = hasHydrated && run.prompt !== null;
  const total = run.viewResponses.length + run.viewManualResponses.length;
  const done =
    run.viewResponses.filter((r) => !r.isStreaming).length +
    run.viewManualResponses.length;
  const status = toConsensusStatus(consensusStatus, {
    readOnly,
    answers: analytics.agreementAnswers.length,
  });

  const consensusProps: ConsensusAnswerProps = {
    status,
    method: consensusMethod,
    summarizerName,
    text: run.viewMetaAnalysis ?? undefined,
    error: consensus.error ?? undefined,
    onRetry: readOnly ? undefined : consensus.restart,
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
    /** Answers finished (including manual ones) out of all answers of the run. */
    progress: { done, total },
    /** Starts a run of the current ensemble, dropping any consensus still running for the old one. */
    startRun: (prompt: string) => {
      consensus.restart();
      // Manual answers of a reopened run belong to that run, not the next.
      if (readOnly) clearManualResponses();
      startRun(prompt);
    },
    /** True while a run reopened from history is on screen. */
    readOnly,
    /** Drops any consensus still running, before another run is shown. */
    stopConsensus: consensus.restart,
    /**
     * Stops the run: aborts the answers still streaming and any consensus
     * in flight. In Pro the run is billed only for what it used.
     */
    stop: () => {
      stop();
      if (
        consensus.isGenerating ||
        run.viewResponses.some((r) => r.isStreaming)
      ) {
        consensus.stop();
      }
    },
    addManualAnswer,
    /** Removes a manual answer; consensus and agreement are made again without it. */
    removeManualAnswer,
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
      onRetry: readOnly ? undefined : retry,
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
