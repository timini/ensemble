/**
 * @module consensus/schemas
 *
 * Zod schemas for strategy-specific ensemble result JSON contracts.
 * These schemas are the **single source of truth** for result shapes.
 * TypeScript types are inferred via `z.infer<>` in `types.ts`.
 *
 * Every schema uses `.passthrough()` so that unknown fields survive
 * round-tripping through storage, enabling forward compatibility when
 * new optional fields are added in later schema versions.
 */
import { z } from 'zod';
// ---------------------------------------------------------------------------
// Shared / reusable schemas
// ---------------------------------------------------------------------------
/**
 * Common metadata present on every ensemble result, regardless of
 * which consensus strategy produced it.
 */
export const EnsembleMetadataSchema = z
    .object({
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.string().datetime(),
    /** The original user prompt submitted to the ensemble */
    prompt: z.string(),
    /** Ordered list of model identifiers that participated */
    modelIds: z.array(z.string()),
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.string(),
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.string().default('1.0.0'),
})
    .passthrough();
/**
 * A single model's response within an ensemble result.
 * Captures both the content and performance metrics.
 */
export const ModelResponseReferenceSchema = z
    .object({
    /** Unique identifier for the model instance */
    modelId: z.string(),
    /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
    provider: z.string(),
    /** Provider-specific model identifier (e.g. 'gpt-4o') */
    model: z.string(),
    /** Human-readable display name */
    modelName: z.string(),
    /** Full text content of the model's response */
    content: z.string(),
    /** Wall-clock response time in milliseconds */
    responseTime: z.number(),
    /** Number of tokens in the response (if available) */
    tokenCount: z.number().optional(),
})
    .passthrough();
// ---------------------------------------------------------------------------
// Strategy-specific result schemas
// ---------------------------------------------------------------------------
/**
 * Result produced by the **Standard** consensus strategy.
 * The summarizer synthesises all model responses into a single answer
 * without ranking or voting.
 */
export const StandardConsensusResultSchema = EnsembleMetadataSchema.extend({
    type: z.literal('standard'),
    /** Synthesised answer combining insights from all models */
    synthesis: z.string(),
    /** Individual model responses included in this result */
    responses: z.array(ModelResponseReferenceSchema),
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z
        .array(z
        .object({
        modelId: z.string(),
        highlight: z.string(),
    })
        .passthrough())
        .optional(),
}).passthrough();
/**
 * Result produced by the **ELO Ranking** consensus strategy.
 * Models are ranked via pairwise comparisons judged by an LLM,
 * then the top-N responses are synthesised.
 */
export const EloRankingResultSchema = EnsembleMetadataSchema.extend({
    type: z.literal('elo'),
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.array(z
        .object({
        modelA: z.string(),
        modelB: z.string(),
        winner: z.string(),
        reasoning: z.string(),
    })
        .passthrough()),
    /** Final ranked list of models with ELO scores */
    rankings: z.array(z
        .object({
        modelId: z.string(),
        score: z.number(),
        rank: z.number(),
    })
        .passthrough()),
    /** Number of top-ranked models used for synthesis */
    topN: z.number(),
    /** Synthesised answer from top-N models */
    synthesis: z.string(),
    /** Individual model responses included in this result */
    responses: z.array(ModelResponseReferenceSchema),
    /** Optional bracket visualisation data */
    tournamentBracket: z.unknown().optional(),
}).passthrough();
/**
 * Result produced by the **Majority Voting** consensus strategy.
 * Responses are scored for alignment with the majority position,
 * and the majority-aligned model anchors the synthesis.
 */
export const MajorityVotingResultSchema = EnsembleMetadataSchema.extend({
    type: z.literal('majority'),
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.array(z
        .object({
        modelId: z.string(),
        score: z.number(),
    })
        .passthrough()),
    /** Model that best represents the majority position */
    majorityModelId: z.string(),
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z
        .object({
        /** Fraction of topics where all models agreed */
        unanimous: z.number(),
        /** Fraction of topics where a majority agreed */
        majority: z.number(),
        /** Fraction of topics where models were evenly split */
        split: z.number(),
    })
        .passthrough(),
    /** Synthesised answer anchored on the majority position */
    synthesis: z.string(),
    /** Individual model responses included in this result */
    responses: z.array(ModelResponseReferenceSchema),
}).passthrough();
/**
 * Result produced by the **LLM Council** consensus strategy.
 * Models engage in structured deliberation rounds before casting
 * final votes to reach consensus.
 */
export const LLMCouncilResultSchema = EnsembleMetadataSchema.extend({
    type: z.literal('council'),
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.array(z
        .object({
        round: z.number(),
        statements: z.array(z
            .object({
            modelId: z.string(),
            statement: z.string(),
            position: z.string(),
        })
            .passthrough()),
    })
        .passthrough()),
    /** Final votes cast by each model after deliberation */
    finalVotes: z.array(z
        .object({
        modelId: z.string(),
        vote: z.string(),
        reasoning: z.string(),
    })
        .passthrough()),
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z
        .object({
        agreementScore: z.number(),
        convergenceRate: z.number(),
        rounds: z.number(),
    })
        .passthrough(),
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.string(),
    /** Individual model responses included in this result */
    responses: z.array(ModelResponseReferenceSchema),
}).passthrough();
// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------
/**
 * Discriminated union of all ensemble result types.
 * The `type` field is the discriminator.
 *
 * Use {@link parseEnsembleResult} to safely parse unknown JSON
 * into this union.
 */
export const EnsembleResultSchema = z.discriminatedUnion('type', [
    StandardConsensusResultSchema,
    EloRankingResultSchema,
    MajorityVotingResultSchema,
    LLMCouncilResultSchema,
]);
// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------
/**
 * Safely parse unknown JSON into a typed {@link EnsembleResult}.
 *
 * Returns the standard Zod `SafeParseReturnType` so callers can
 * inspect `.success`, `.data`, or `.error` as needed.
 *
 * @example
 * ```ts
 * const result = parseEnsembleResult(jsonFromStorage);
 * if (result.success) {
 *   console.log(result.data.type); // 'standard' | 'elo' | 'majority' | 'council'
 * } else {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export function parseEnsembleResult(json) {
    return EnsembleResultSchema.safeParse(json);
}
