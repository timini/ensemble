import type { z } from 'zod';

import type {
  EnsembleResultSchema,
  StandardConsensusResultSchema,
  EloRankingResultSchema,
  MajorityVotingResultSchema,
  LLMCouncilResultSchema,
} from './schemas';

/**
 * @module consensus/types
 *
 * Core types for consensus strategies.
 */

export interface ConsensusModelResponse {
    modelId: string;
    modelName: string; // "model" in ModelResponse
    content: string;   // "response" in ModelResponse
}

export type ConsensusMethod = 'standard' | 'elo' | 'majority';

export interface Pairing {
    modelA: ConsensusModelResponse;
    modelB: ConsensusModelResponse;
}

export interface RankingResult {
    modelId: string;
    eloScore: number;
    rank: number;
}

export interface ConsensusStrategy {
    rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]>;
    generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Inferred types from Zod schemas
// ---------------------------------------------------------------------------

/** Union of all strategy-specific ensemble result types. */
export type EnsembleResult = z.infer<typeof EnsembleResultSchema>;

/** Result produced by the Standard consensus strategy. */
export type StandardConsensusResult = z.infer<typeof StandardConsensusResultSchema>;

/** Result produced by the ELO Ranking consensus strategy. */
export type EloRankingResult = z.infer<typeof EloRankingResultSchema>;

/** Result produced by the Majority Voting consensus strategy. */
export type MajorityVotingResult = z.infer<typeof MajorityVotingResultSchema>;

/** Result produced by the LLM Council consensus strategy. */
export type LLMCouncilResult = z.infer<typeof LLMCouncilResultSchema>;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Narrows an {@link EnsembleResult} to {@link StandardConsensusResult}. */
export function isStandardResult(
  result: EnsembleResult,
): result is StandardConsensusResult {
  return result.type === 'standard';
}

/** Narrows an {@link EnsembleResult} to {@link EloRankingResult}. */
export function isEloResult(
  result: EnsembleResult,
): result is EloRankingResult {
  return result.type === 'elo';
}

/** Narrows an {@link EnsembleResult} to {@link MajorityVotingResult}. */
export function isMajorityResult(
  result: EnsembleResult,
): result is MajorityVotingResult {
  return result.type === 'majority';
}

/** Narrows an {@link EnsembleResult} to {@link LLMCouncilResult}. */
export function isCouncilResult(
  result: EnsembleResult,
): result is LLMCouncilResult {
  return result.type === 'council';
}
