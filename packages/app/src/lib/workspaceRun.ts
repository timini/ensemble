/**
 * Maps the run in the store to the props of the workspace's result
 * components: AgreementSummary, ConsensusAnswer and AnswerColumns. Pure, so
 * every state the old review page handled is tested here.
 */
import { parseEndpointModelId } from "@ensemble-ai/shared-utils/providers";
import type { AgreementSummaryProps } from "@/components/molecules/AgreementSummary";
import type { ConsensusAnswerStatus } from "@/components/molecules/ConsensusAnswer";
import type { AnswerColumnItem } from "@/components/organisms/AnswerColumns";
import type { PairwiseComparison } from "@/components/organisms/AgreementAnalysis";
import type { ConsensusStatus } from "@/components/organisms/ConsensusCard";
import type { ManualResponse, ModelResponse, ModelSelection } from "~/store";
import type { AgreementCalibrationProps } from "./agreementCalibration";
import type { EndpointLabel } from "./endpointModels";

/** Embeddings state, as useResponseEmbeddings reports it. */
export type EmbeddingsState = "unavailable" | "pending" | "ready" | "error";

export interface AgreementInput {
  embeddings: EmbeddingsState;
  /** No answer is still streaming. */
  finished: boolean;
  /** Answers in the run (models and manual). */
  total: number;
  /** Answers finished so far, while streaming. */
  done: number;
  /** Successful answers the score can compare (models and manual). */
  scorable: number;
  /** Overall agreement, 0 to 1. */
  overall: number;
  comparisons: PairwiseComparison[];
  /** Answers left out because their embedding failed. */
  excluded: string[];
  calibration: AgreementCalibrationProps;
  /** `ollama pull ...` when a connected Ollama has no embedding model. */
  pullCommand?: string;
  onOpenSettings?: () => void;
}

/** Agreement card props: pending, the score, or why there is none. */
export function toAgreementProps(input: AgreementInput): AgreementSummaryProps {
  const { levelThresholds: thresholds, calibration } = input.calibration;
  if (!input.finished) {
    return {
      status: "pending",
      progress: { done: input.done, total: input.total },
    };
  }
  if (input.scorable < 2)
    return { status: "unavailable", reason: "tooFewAnswers" };
  if (input.embeddings === "unavailable") {
    return {
      status: "unavailable",
      reason: "noEmbeddings",
      command: input.pullCommand,
      onOpenSettings: input.onOpenSettings,
    };
  }
  if (input.embeddings === "pending") {
    return {
      status: "pending",
      progress: { done: input.total, total: input.total },
    };
  }
  // Ready with nothing to compare: the vectors could not be scored (a zero
  // vector or mismatched sizes). Say so instead of a blank score.
  if (input.embeddings === "error" || input.comparisons.length === 0) {
    return { status: "unavailable", reason: "error" };
  }
  return {
    status: "ready",
    score: input.overall,
    pairs: input.comparisons.map((c) => ({
      a: c.model1,
      b: c.model2,
      score: c.similarity,
    })),
    thresholds,
    calibration,
    excluded: input.excluded,
  };
}

/**
 * Consensus card status. `null` from useConsensusStatus means the run
 * finished with fewer answers than consensus needs or, for a run reopened
 * from history (`readOnly`) with at least 2 answers, that no consensus was
 * saved with it.
 */
export function toConsensusStatus(
  status: ConsensusStatus | null,
  reopened?: { readOnly: boolean; answers: number },
): ConsensusAnswerStatus {
  if (status) return status;
  return reopened?.readOnly && reopened.answers >= 2
    ? "notSaved"
    : "unavailable";
}

export interface AnswerItemsInput {
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  /** Models of the run, to find each answer's model id. */
  runModels: ModelSelection[];
  endpoints: readonly EndpointLabel[];
  onRetry?: (selectionId: string) => void;
}

function answerStatus(response: ModelResponse): AnswerColumnItem["status"] {
  if (response.error) return "error";
  if (response.isStreaming) return response.response ? "streaming" : "waiting";
  return "complete";
}

/**
 * One item per answer: models in run order (waiting until their stream
 * starts), then the manual answers. Ids are the model ids (`gpt-6-luna`,
 * `ollama/llama3.2:3b`) or the manual answer ids. Endpoint models show
 * their id on the server, with the endpoint as the provider line.
 */
export function toAnswerItems(input: AnswerItemsInput): AnswerColumnItem[] {
  const byId = new Map(input.responses.map((r) => [r.modelId, r]));
  const started = new Set(input.runModels.map((m) => m.id));
  // Answers whose model is not in runModels (runs stored before it existed).
  const ordered: Array<{
    selection?: ModelSelection;
    response?: ModelResponse;
  }> = [
    ...input.runModels.map((selection) => ({
      selection,
      response: byId.get(selection.id),
    })),
    ...input.responses
      .filter((r) => !started.has(r.modelId))
      .map((response) => ({ response })),
  ];

  const models = ordered.map(({ selection, response }): AnswerColumnItem => {
    const modelId = selection?.model ?? response!.modelId;
    const provider = selection?.provider ?? response!.provider;
    const parsed =
      provider === "openai-compatible" ? parseEndpointModelId(modelId) : null;
    const endpointLabel =
      parsed && input.endpoints.find((e) => e.id === parsed.endpointId)?.label;
    const selectionId = selection?.id ?? response!.modelId;
    const base = {
      id: modelId,
      provider,
      modelName: parsed ? parsed.modelId : (response?.model ?? modelId),
      ...(endpointLabel ? { providerLabel: endpointLabel } : {}),
    };
    if (!response) return { ...base, status: "waiting" };
    return {
      ...base,
      status: answerStatus(response),
      content: response.response,
      durationMs: response.responseTime ?? undefined,
      error: response.error ?? undefined,
      errorKind: response.errorKind ?? undefined,
      retryAfterSeconds: response.retryAfterSeconds ?? undefined,
      onRetry: input.onRetry ? () => input.onRetry?.(selectionId) : undefined,
    };
  });

  const manual = input.manualResponses.map(
    (m): AnswerColumnItem => ({
      id: m.id,
      modelName: m.label,
      kind: "manual",
      status: "complete",
      content: m.response,
    }),
  );
  return [...models, ...manual];
}
