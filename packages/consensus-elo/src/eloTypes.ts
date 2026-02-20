/**
 * @module consensus-elo/eloTypes
 *
 * Internal types and pure resolution logic for the ELO ranking consensus strategy.
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

/**
 * Maps a reversed-order outcome back to the original order.
 * When positions are swapped, "A wins" in the reversed prompt means
 * the model originally in position B actually won.
 */
export function mapReversedOutcome(outcome: SingleJudgmentOutcome): SingleJudgmentOutcome {
    if (outcome === 'A') return 'B';
    if (outcome === 'B') return 'A';
    return outcome; // TIE and ERROR are symmetric
}

/**
 * Resolves forward and reversed outcomes into a final judgment.
 *
 * Both outcomes should be in the same frame of reference (original pair order)
 * — the reversed outcome must be mapped via {@link mapReversedOutcome} first.
 *
 * @param forward - Outcome from the forward (original order) judge call
 * @param reversed - Outcome from the reversed judge call (already mapped back)
 * @returns Winner label and confidence, or `null` for double-error (skip pair)
 */
export function resolveSwappedOutcomes(
    forward: SingleJudgmentOutcome,
    reversed: SingleJudgmentOutcome,
): { winner: 'A' | 'B' | 'TIE'; confidence: JudgmentConfidence } | null {
    // Double error -> skip
    if (forward === 'ERROR' && reversed === 'ERROR') return null;

    // Single error -> use the valid one at LOW confidence
    if (forward === 'ERROR') {
        const w: 'A' | 'B' | 'TIE' = reversed === 'TIE' ? 'TIE' : reversed as 'A' | 'B';
        return { winner: w, confidence: 'LOW' };
    }
    if (reversed === 'ERROR') {
        const w: 'A' | 'B' | 'TIE' = forward === 'TIE' ? 'TIE' : forward as 'A' | 'B';
        return { winner: w, confidence: 'LOW' };
    }

    // Both valid — check consistency
    if (forward === reversed) {
        // Consistent: both agree on same winner or both TIE
        const w: 'A' | 'B' | 'TIE' = forward === 'TIE' ? 'TIE' : forward as 'A' | 'B';
        return { winner: w, confidence: 'HIGH' };
    }

    // Both valid but disagree
    if (forward === 'TIE' || reversed === 'TIE') {
        // One says winner, other says TIE -> use the winner at LOW confidence
        const nonTie = forward === 'TIE' ? reversed : forward;
        return { winner: nonTie as 'A' | 'B', confidence: 'LOW' };
    }

    // Contradictory: one says A, other says B -> TIE at LOW confidence
    return { winner: 'TIE', confidence: 'LOW' };
}
