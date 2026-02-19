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
/**
 * Common metadata present on every ensemble result, regardless of
 * which consensus strategy produced it.
 */
export declare const EnsembleMetadataSchema: z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * A single model's response within an ensemble result.
 * Captures both the content and performance metrics.
 */
export declare const ModelResponseReferenceSchema: z.ZodObject<{
    /** Unique identifier for the model instance */
    modelId: z.ZodString;
    /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
    provider: z.ZodString;
    /** Provider-specific model identifier (e.g. 'gpt-4o') */
    model: z.ZodString;
    /** Human-readable display name */
    modelName: z.ZodString;
    /** Full text content of the model's response */
    content: z.ZodString;
    /** Wall-clock response time in milliseconds */
    responseTime: z.ZodNumber;
    /** Number of tokens in the response (if available) */
    tokenCount: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** Unique identifier for the model instance */
    modelId: z.ZodString;
    /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
    provider: z.ZodString;
    /** Provider-specific model identifier (e.g. 'gpt-4o') */
    model: z.ZodString;
    /** Human-readable display name */
    modelName: z.ZodString;
    /** Full text content of the model's response */
    content: z.ZodString;
    /** Wall-clock response time in milliseconds */
    responseTime: z.ZodNumber;
    /** Number of tokens in the response (if available) */
    tokenCount: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** Unique identifier for the model instance */
    modelId: z.ZodString;
    /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
    provider: z.ZodString;
    /** Provider-specific model identifier (e.g. 'gpt-4o') */
    model: z.ZodString;
    /** Human-readable display name */
    modelName: z.ZodString;
    /** Full text content of the model's response */
    content: z.ZodString;
    /** Wall-clock response time in milliseconds */
    responseTime: z.ZodNumber;
    /** Number of tokens in the response (if available) */
    tokenCount: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Result produced by the **Standard** consensus strategy.
 * The summarizer synthesises all model responses into a single answer
 * without ranking or voting.
 */
export declare const StandardConsensusResultSchema: z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Result produced by the **ELO Ranking** consensus strategy.
 * Models are ranked via pairwise comparisons judged by an LLM,
 * then the top-N responses are synthesised.
 */
export declare const EloRankingResultSchema: z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Result produced by the **Majority Voting** consensus strategy.
 * Responses are scored for alignment with the majority position,
 * and the majority-aligned model anchors the synthesis.
 */
export declare const MajorityVotingResultSchema: z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Result produced by the **LLM Council** consensus strategy.
 * Models engage in structured deliberation rounds before casting
 * final votes to reach consensus.
 */
export declare const LLMCouncilResultSchema: z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Discriminated union of all ensemble result types.
 * The `type` field is the discriminator.
 *
 * Use {@link parseEnsembleResult} to safely parse unknown JSON
 * into this union.
 */
export declare const EnsembleResultSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>, z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, z.ZodTypeAny, "passthrough">>, z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>, z.ZodObject<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>]>;
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
export declare function parseEnsembleResult(json: unknown): z.SafeParseReturnType<z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough"> | z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, z.ZodTypeAny, "passthrough"> | z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough"> | z.objectInputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"standard">;
    /** Synthesised answer combining insights from all models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional highlighted excerpts from source responses */
    sourceHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        highlight: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough"> | z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"elo">;
    /** Pairwise comparison outcomes used to compute ELO scores */
    pairwiseComparisons: z.ZodArray<z.ZodObject<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelA: z.ZodString;
        modelB: z.ZodString;
        winner: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final ranked list of models with ELO scores */
    rankings: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Number of top-ranked models used for synthesis */
    topN: z.ZodNumber;
    /** Synthesised answer from top-N models */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Optional bracket visualisation data */
    tournamentBracket: z.ZodOptional<z.ZodUnknown>;
}, z.ZodTypeAny, "passthrough"> | z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"majority">;
    /** Per-model alignment scores (0-100) with the majority position */
    alignmentScores: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        score: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Model that best represents the majority position */
    majorityModelId: z.ZodString;
    /** Breakdown of how models agreed or disagreed */
    agreementBreakdown: z.ZodObject<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Fraction of topics where all models agreed */
        unanimous: z.ZodNumber;
        /** Fraction of topics where a majority agreed */
        majority: z.ZodNumber;
        /** Fraction of topics where models were evenly split */
        split: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer anchored on the majority position */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough"> | z.objectOutputType<{
    /** ISO 8601 timestamp of when the result was created */
    timestamp: z.ZodString;
    /** The original user prompt submitted to the ensemble */
    prompt: z.ZodString;
    /** Ordered list of model identifiers that participated */
    modelIds: z.ZodArray<z.ZodString, "many">;
    /** Model identifier used to produce the final synthesis */
    summarizerModel: z.ZodString;
    /** Semantic version of the schema that produced this result */
    schemaVersion: z.ZodDefault<z.ZodString>;
} & {
    type: z.ZodLiteral<"council">;
    /** Rounds of structured deliberation between models */
    deliberationRounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        round: z.ZodNumber;
        statements: z.ZodArray<z.ZodObject<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            modelId: z.ZodString;
            statement: z.ZodString;
            position: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Final votes cast by each model after deliberation */
    finalVotes: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        modelId: z.ZodString;
        vote: z.ZodString;
        reasoning: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    /** Aggregate metrics describing how well the council converged */
    consensusMetrics: z.ZodObject<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        agreementScore: z.ZodNumber;
        convergenceRate: z.ZodNumber;
        rounds: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    /** Synthesised answer reflecting the council's consensus */
    synthesis: z.ZodString;
    /** Individual model responses included in this result */
    responses: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique identifier for the model instance */
        modelId: z.ZodString;
        /** Provider name (e.g. 'openai', 'anthropic', 'google', 'xai') */
        provider: z.ZodString;
        /** Provider-specific model identifier (e.g. 'gpt-4o') */
        model: z.ZodString;
        /** Human-readable display name */
        modelName: z.ZodString;
        /** Full text content of the model's response */
        content: z.ZodString;
        /** Wall-clock response time in milliseconds */
        responseTime: z.ZodNumber;
        /** Number of tokens in the response (if available) */
        tokenCount: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>;
//# sourceMappingURL=schemas.d.ts.map