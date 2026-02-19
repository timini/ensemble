// Backward compat — re-exports from new packages
// Note: consensus-core also exports AIProvider and related provider types,
// but those are already exported by ../providers. We selectively re-export
// only the consensus-specific types to avoid duplicate export errors.
export {
  // Types
  type ConsensusModelResponse,
  type ConsensusMethod,
  type Pairing,
  type RankingResult,
  type ConsensusStrategy,
  type EnsembleResult,
  type StandardConsensusResult,
  type EloRankingResult,
  type MajorityVotingResult,
  type LLMCouncilResult,
  // Type guards
  isStandardResult,
  isEloResult,
  isMajorityResult,
  isCouncilResult,
  // Schemas
  EnsembleMetadataSchema,
  ModelResponseReferenceSchema,
  StandardConsensusResultSchema,
  EloRankingResultSchema,
  MajorityVotingResultSchema,
  LLMCouncilResultSchema,
  EnsembleResultSchema,
  parseEnsembleResult,
} from '@ensemble-ai/consensus-core';

export * from '@ensemble-ai/consensus-standard';
export * from '@ensemble-ai/consensus-elo';
export * from '@ensemble-ai/consensus-majority';
export * from '@ensemble-ai/consensus-council';
