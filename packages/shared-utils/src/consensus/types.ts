/**
 * @module consensus/types
 *
 * Core consensus types and Zod-inferred result types.
 *
 * Strategy-specific result types (`EnsembleResult`, `StandardConsensusResult`,
 * etc.) are **inferred from Zod schemas** in `schemas.ts`.  Do not duplicate
 * them as hand-written interfaces.
 */

import type { z } from 'zod';

import type {
    EnsembleMetadataSchema,
    EnsembleResultSchema,
    EloRankingResultSchema,
    LLMCouncilResultSchema,
    MajorityVotingResultSchema,
    ModelResponseReferenceSchema,
    StandardConsensusResultSchema,
} from './schemas';

// ---------------------------------------------------------------------------
// Hand-written types (pre-existing, used by strategy classes)
// ---------------------------------------------------------------------------

export interface ConsensusModelResponse {
    modelId: string;
    modelName: string; // "model" in ModelResponse
    content: string;   // "response" in ModelResponse
}

export type ConsensusMethod = 'standard' | 'elo' | 'majority' | 'council';

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
// Zod-inferred result types
// ---------------------------------------------------------------------------

/** Common metadata present on every ensemble result. */
export type EnsembleMetadata = z.infer<typeof EnsembleMetadataSchema>;

/** A single model's response within an ensemble result. */
export type ModelResponseReference = z.infer<typeof ModelResponseReferenceSchema>;

/** Result from the Standard consensus strategy. */
export type StandardConsensusResult = z.infer<typeof StandardConsensusResultSchema>;

/** Result from the ELO Ranking consensus strategy. */
export type EloRankingResult = z.infer<typeof EloRankingResultSchema>;

/** Result from the Majority Voting consensus strategy. */
export type MajorityVotingResult = z.infer<typeof MajorityVotingResultSchema>;

/** Result from the LLM Council consensus strategy. */
export type LLMCouncilResult = z.infer<typeof LLMCouncilResultSchema>;

/** Discriminated union of all ensemble result types. */
export type EnsembleResult = z.infer<typeof EnsembleResultSchema>;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Narrows an {@link EnsembleResult} to a {@link StandardConsensusResult}.
 */
export function isStandardResult(result: EnsembleResult): result is StandardConsensusResult {
    return result.type === 'standard';
}

/**
 * Narrows an {@link EnsembleResult} to an {@link EloRankingResult}.
 */
export function isEloResult(result: EnsembleResult): result is EloRankingResult {
    return result.type === 'elo';
}

/**
 * Narrows an {@link EnsembleResult} to a {@link MajorityVotingResult}.
 */
export function isMajorityResult(result: EnsembleResult): result is MajorityVotingResult {
    return result.type === 'majority';
}

/**
 * Narrows an {@link EnsembleResult} to an {@link LLMCouncilResult}.
 */
export function isCouncilResult(result: EnsembleResult): result is LLMCouncilResult {
    return result.type === 'council';
}
