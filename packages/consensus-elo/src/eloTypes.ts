/**
 * @module consensus-elo/eloTypes
 *
 * Internal types for the ELO ranking consensus strategy.
 * These types coordinate between the scoring, judge, and orchestration modules.
 * They are not exported from the package public API.
 */

/** Outcome of a single judge call (one direction of a pair comparison). */
export type SingleJudgmentOutcome = 'A' | 'B' | 'TIE' | 'ERROR';

/** Confidence level derived from position-swap consistency. */
export type JudgmentConfidence = 'HIGH' | 'LOW';

/**
 * Result of judging a single pair with position-swap debiasing.
 *
 * - `winnerId` is the model ID of the winner, or `null` for a tie.
 * - When `confidence` is `undefined`, both judge calls errored (double-error)
 *   and this pair should be skipped entirely.
 */
export interface PairJudgment {
    /** Model ID of the winner, or `null` for a tie. */
    winnerId: string | null;
    /** Confidence derived from position-swap consistency. `undefined` for double-error (skip). */
    confidence: JudgmentConfidence | undefined;
    /** Optional reasoning extracted from chain-of-thought judge responses. */
    reasoning?: { forward: string; reversed: string };
}
