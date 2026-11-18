import type { AgreementSummaryProps } from "@/components/molecules/AgreementSummary";
import type { ConsensusAnswerProps } from "@/components/molecules/ConsensusAnswer";
import type { AnswerColumnItem } from "@/components/organisms/AnswerColumns";
import type { SharedRun } from "./sharedRun";

/** A stored shared run as the props of the SharedRun organism's parts. */
export interface SharedRunViewProps {
  agreement: AgreementSummaryProps | null;
  consensus: ConsensusAnswerProps;
  answers: AnswerColumnItem[];
}

/** Maps a shared run back to the read-only result components' props. */
export function toSharedRunView(run: SharedRun): SharedRunViewProps {
  return {
    agreement: run.agreement
      ? {
          status: "ready",
          score: run.agreement.score,
          pairs: run.agreement.pairs,
          thresholds: run.agreement.thresholds,
          calibration: run.agreement.calibration,
        }
      : null,
    consensus: {
      status: run.consensus ? "success" : "notSaved",
      text: run.consensus ?? undefined,
      method: run.method,
      summarizerName: run.summarizerName,
      majorityVote: run.majorityVote,
    },
    answers: run.answers.map((a) => ({
      id: a.id,
      modelName: a.modelName,
      provider: a.provider as AnswerColumnItem["provider"],
      providerLabel: a.providerLabel,
      kind: a.kind,
      status: a.status,
      content: a.content,
    })),
  };
}
