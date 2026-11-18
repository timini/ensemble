import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import {
  agreementLevel,
  type AgreementSummaryProps,
} from "@/components/molecules/AgreementSummary";
import type { MajorityVoteRecord } from "~/lib/majorityVote";
import type {
  ConsensusMethod,
  ModelSelection,
} from "~/store/slices/ensembleSlice";
import {
  selectRunModels,
  type HistoryView,
} from "~/store/slices/responseSlice";
import type {
  AgreementStats,
  ManualResponse,
  ModelResponse,
} from "~/store/slices/responseTypes";
import type { StoredAgreementLevel, StoredRun } from "./runHistory";

/** Store fields a history record is built from. */
export interface RunRecordSource {
  runPrompt: string | null;
  prompt: string | null;
  runModels: ModelSelection[];
  selectedModels: ModelSelection[];
  runStartedAt: number | null;
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  embeddings: Array<{ modelId: string; embedding: number[] }>;
  embeddingsSource: string | null;
  similarityMatrix: number[][] | null;
  agreementStats: AgreementStats | null;
  metaAnalysis: string | null;
  majorityVote: MajorityVoteRecord | null;
  consensusUsage: CallUsage[];
  consensusMethod: ConsensusMethod;
  summarizerModel: string | null;
  historyView: HistoryView | null;
}

/** Figures worked out on the workspace rather than kept in the store. */
export interface RunRecordExtras {
  agreementScore: number | null;
  agreementLevel: StoredAgreementLevel | null;
  costUsd: number | null;
}

/**
 * Agreement and cost of the run on screen as the workspace shows them, for
 * its history record. Null where they are not known yet.
 */
export function runRecordExtras(
  agreement: Pick<AgreementSummaryProps, "status" | "score" | "thresholds">,
  /** Cost props of the run; only an actual cost has `totalUsd`. */
  cost: object | undefined,
): RunRecordExtras {
  const scored = agreement.status === "ready" && agreement.score !== undefined;
  return {
    agreementScore: scored ? agreement.score! : null,
    agreementLevel: scored
      ? agreementLevel(agreement.score!, agreement.thresholds)
      : null,
    costUsd:
      cost && "totalUsd" in cost && typeof cost.totalUsd === "number"
        ? cost.totalUsd
        : null,
  };
}

/** History id of the run started at `startedAt`. */
export function runRecordId(startedAt: number): string {
  return `run-${startedAt}`;
}

/**
 * The run on screen as a history record, or null when there is nothing to
 * keep yet: no run, an answer still streaming, no answers, or a run that
 * was itself reopened from history.
 */
export function toStoredRun(
  state: RunRecordSource,
  extras: RunRecordExtras,
): StoredRun | null {
  const prompt = state.runPrompt;
  const startedAt = state.runStartedAt;
  if (!prompt || startedAt === null || state.historyView) return null;
  if (state.responses.length + state.manualResponses.length === 0) return null;
  if (state.responses.some((r) => r.isStreaming)) return null;
  return {
    id: runRecordId(startedAt),
    createdAt: startedAt,
    prompt,
    models: selectRunModels(state),
    consensusMethod: state.consensusMethod,
    summarizerModel: state.summarizerModel,
    responses: state.responses,
    manualResponses: state.manualResponses,
    embeddings: state.embeddings,
    embeddingsSource: state.embeddingsSource,
    similarityMatrix: state.similarityMatrix,
    agreementStats: state.agreementStats,
    metaAnalysis: state.metaAnalysis,
    majorityVote: state.majorityVote,
    consensusUsage: state.consensusUsage,
    ...extras,
  };
}

/**
 * Store fields that put a stored run back on screen, read only. The
 * composer's own ensemble, method and summarizer are left alone.
 */
export function restoredRunState(run: StoredRun) {
  return {
    runPrompt: run.prompt,
    prompt: run.prompt,
    runModels: run.models,
    runStartedAt: run.createdAt,
    responses: run.responses,
    manualResponses: run.manualResponses,
    embeddings: run.embeddings,
    embeddingsSource: run.embeddingsSource,
    similarityMatrix: run.similarityMatrix,
    agreementStats: run.agreementStats,
    metaAnalysis: run.metaAnalysis,
    majorityVote: run.majorityVote,
    consensusUsage: run.consensusUsage,
    historyView: {
      id: run.id,
      consensusMethod: run.consensusMethod,
      summarizerModel: run.summarizerModel,
    },
  };
}
