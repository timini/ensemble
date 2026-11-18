/** State and actions of the response slice (see responseSlice.ts). */
import type { TokenUsage } from "@ensemble-ai/shared-utils/providers";
import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import type { MajorityVoteRecord } from "~/lib/majorityVote";
import type {
  ConsensusMethod,
  ModelSelection,
  ProviderType,
} from "./ensembleSlice";
import type { ResponseErrorDetails } from "./responseErrorState";
import type {
  AgreementStats,
  ManualResponse,
  ModelResponse,
} from "./responseTypes";

/** The method and summarizer a consensus was made with. */
export interface ConsensusSettings {
  consensusMethod: ConsensusMethod;
  summarizerModel: string | null;
}

/** The reopened run's id and the settings it was run with. */
export interface HistoryView extends ConsensusSettings {
  id: string;
}

export interface ResponseSlice {
  /** Prompt draft on /prompt, saved as the user types. */
  prompt: string | null;
  /**
   * Prompt the current run was submitted with, or null. Kept apart from the
   * draft so editing the next prompt never relabels the last run's answers.
   */
  runPrompt: string | null;
  /**
   * Models the current run was started with, so editing the ensemble for
   * the next question never changes the run on screen (retries, consensus
   * and cost keep using these). Empty when there is no run.
   */
  runModels: ModelSelection[];
  /**
   * When the current run was started (ms since the epoch), or null when
   * there is no run or it was stored before this field existed.
   */
  runStartedAt: number | null;
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  embeddings: Array<{ modelId: string; embedding: number[] }>;
  /** Provider that produced `embeddings`, or null when unknown. */
  embeddingsSource: string | null;
  /**
   * Embedding model that produced `embeddings`, as `provider/model` (an
   * endpoint model includes its endpoint id), or null when unknown. Vectors
   * from different models cannot be compared, so this decides reuse.
   */
  embeddingsModel: string | null;
  similarityMatrix: number[][] | null;
  agreementStats: AgreementStats | null;
  metaAnalysis: string | null;
  /**
   * Method and summarizer that produced `metaAnalysis`. The composer may
   * change while consensus runs, so the run records these instead.
   */
  consensusSettings: ConsensusSettings | null;
  /** Token usage of each consensus call in the current run. */
  consensusUsage: CallUsage[];
  /** Vote breakdown of the last majority consensus, or null. */
  majorityVote: MajorityVoteRecord | null;
  /**
   * Set while a run reopened from history is on screen. That run is read
   * only: no embeddings, consensus or retries are requested for it, and it
   * shows the method and summarizer it was run with. Null for a live run.
   */
  historyView: HistoryView | null;

  setPrompt: (prompt: string) => void;
  /**
   * Starts a new run: clears the previous results and records its prompt,
   * models and start time.
   */
  startRun: (prompt: string, models?: ModelSelection[]) => void;
  startStreaming: (
    modelId: string,
    provider: ProviderType,
    model: string,
  ) => void;
  appendStreamChunk: (modelId: string, chunk: string) => void;
  completeResponse: (
    modelId: string,
    responseTime: number,
    tokenCount?: number,
    usage?: TokenUsage,
  ) => void;
  setError: (
    modelId: string,
    error: string,
    details?: ResponseErrorDetails,
  ) => void;
  addManualResponse: (label: string, response: string) => void;
  /**
   * Drops a manual answer with its embedding and scores agreement again
   * over the answers left. The caller clears the consensus.
   */
  removeManualResponse: (id: string) => void;
  /**
   * Drops every manual answer. Manual answers belong to one prompt, so a
   * new comparison must not carry them over to the next run.
   */
  clearManualResponses: () => void;
  setEmbeddings: (
    embeddings: Array<{ modelId: string; embedding: number[] }>,
    source?: string | null,
    model?: string | null,
  ) => void;
  calculateAgreement: () => void;
  setMetaAnalysis: (analysis: string, settings?: ConsensusSettings) => void;
  addConsensusUsage: (call: CallUsage) => void;
  setMajorityVote: (vote: MajorityVoteRecord | null) => void;
  /**
   * Drops the consensus text and majority vote so consensus runs again (for
   * example after a failed model is retried). Billed usage is kept.
   */
  clearConsensus: () => void;
  clearResponses: () => void;
  resetStreamingState: () => void;
}
