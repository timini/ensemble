import type { z } from 'zod';
import type { EnsembleResultSchema, StandardConsensusResultSchema, EloRankingResultSchema, MajorityVotingResultSchema, LLMCouncilResultSchema } from './schemas';
/**
 * @module consensus/types
 *
 * Core types for consensus strategies.
 */
export interface StreamResponseOptions {
    temperature?: number;
    seed?: number;
}
export interface JsonSchema {
    name: string;
    schema: Record<string, unknown>;
}
export interface GenerateStructuredOptions {
    temperature?: number;
}
export interface StructuredResponse<T> {
    parsed: T;
    raw: string;
    responseTimeMs: number;
    tokenCount?: number;
}
export type ModelModality = 'text' | 'image' | 'audio' | 'video';
export type ProviderName = 'openai' | 'anthropic' | 'google' | 'xai';
export interface ModelMetadata {
    id: string;
    name: string;
    provider: ProviderName;
    contextWindow: number;
    costPer1kTokens: number;
    modalities?: ModelModality[];
}
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
export interface AIProvider {
    streamResponse(prompt: string, model: string, onChunk: (chunk: string) => void, onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void, onError: (error: Error) => void, options?: StreamResponseOptions): Promise<void>;
    generateEmbeddings(text: string): Promise<number[]>;
    validateApiKey(apiKey: string): Promise<ValidationResult>;
    listAvailableModels(): ModelMetadata[];
    listAvailableTextModels(): Promise<string[]>;
    generateStructured<T>(prompt: string, model: string, schema: JsonSchema, options?: GenerateStructuredOptions): Promise<StructuredResponse<T>>;
}
export interface ConsensusModelResponse {
    modelId: string;
    modelName: string;
    content: string;
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
/** Narrows an {@link EnsembleResult} to {@link StandardConsensusResult}. */
export declare function isStandardResult(result: EnsembleResult): result is StandardConsensusResult;
/** Narrows an {@link EnsembleResult} to {@link EloRankingResult}. */
export declare function isEloResult(result: EnsembleResult): result is EloRankingResult;
/** Narrows an {@link EnsembleResult} to {@link MajorityVotingResult}. */
export declare function isMajorityResult(result: EnsembleResult): result is MajorityVotingResult;
/** Narrows an {@link EnsembleResult} to {@link LLMCouncilResult}. */
export declare function isCouncilResult(result: EnsembleResult): result is LLMCouncilResult;
//# sourceMappingURL=types.d.ts.map