import type {
  MajorityConsensusMethod,
  MajorityConsensusOutcome,
  MajorityFallbackReason,
  MajorityVoteResult,
} from "@ensemble-ai/consensus-majority";
import type { MajorityVoteBreakdownProps } from "@/components/molecules/MajorityVoteBreakdown";

/**
 * What the review page keeps of a majority consensus run: how the consensus
 * was made, the vote count, and the name of every model that took part (the
 * vote only holds model ids).
 */
export interface MajorityVoteRecord {
  method: MajorityConsensusMethod;
  fallbackReason?: MajorityFallbackReason;
  vote: MajorityVoteResult | null;
  modelNames: Record<string, string>;
}

/** Build the stored record from the strategy outcome and the voting answers. */
export function toMajorityVoteRecord(
  outcome: MajorityConsensusOutcome,
  responses: { modelId: string; modelName: string }[],
): MajorityVoteRecord {
  const modelNames: Record<string, string> = {};
  for (const response of responses) {
    modelNames[response.modelId] = response.modelName;
  }
  return {
    method: outcome.method,
    ...(outcome.fallbackReason
      ? { fallbackReason: outcome.fallbackReason }
      : {}),
    vote: outcome.vote,
    modelNames,
  };
}

/** Props for MajorityVoteBreakdown, with model ids replaced by names. */
export function toMajorityVoteBreakdownProps(
  record: MajorityVoteRecord,
): Omit<MajorityVoteBreakdownProps, "className"> {
  const name = (modelId: string) => record.modelNames[modelId] ?? modelId;
  const { vote } = record;
  if (!vote) {
    return {
      outcome: "extraction-failed",
      totalResponses: Object.keys(record.modelNames).length,
      options: [],
      abstainedModels: [],
    };
  }
  return {
    outcome: vote.status,
    totalResponses: vote.totalResponses,
    options: vote.tallies.map((tally) => ({
      answer: tally.answer,
      votes: tally.votes,
      models: tally.modelIds.map(name),
    })),
    abstainedModels: vote.abstentions.map(name),
  };
}
