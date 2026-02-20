/**
 * @module consensus-elo/eloScoring
 *
 * Pure ELO mathematics — no I/O, no side effects.
 * All functions are deterministic given the same inputs.
 *
 * The standard ELO formula is used:
 *   E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 *   R'_A = R_A + K * (S_A - E_A)
 *
 * Confidence-weighted K-factors allow position-swap debiasing results
 * to influence how strongly each judgment affects ratings:
 * - HIGH confidence (consistent across positions): K = 32
 * - LOW confidence (inconsistent/partial): K = 16
 */

import type { JudgmentConfidence } from './eloTypes';

/** Starting ELO rating for every model. */
export const INITIAL_ELO = 1200;

/** Base K-factor for HIGH-confidence judgments (consistent position-swap). */
export const K_FACTOR_HIGH = 32;

/** Reduced K-factor for LOW-confidence judgments (position-swap disagreement). */
export const K_FACTOR_LOW = 16;

/**
 * Returns the effective K-factor for a given confidence level.
 *
 * @param confidence - Judgment confidence from position-swap resolution
 * @returns K-factor: 32 for HIGH, 16 for LOW
 */
export function effectiveKFactor(confidence: JudgmentConfidence): number {
    return confidence === 'HIGH' ? K_FACTOR_HIGH : K_FACTOR_LOW;
}

/**
 * Computes the expected score for player A given both ratings.
 * Uses the standard ELO formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 *
 * @param ratingA - Current rating of player A
 * @param ratingB - Current rating of player B
 * @returns Expected score for player A (between 0 and 1)
 */
export function expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Applies a single ELO update to the scores map (mutates in place).
 *
 * When `winnerId` is `null`, both players receive an actual score of 0.5
 * (tie), which pushes unequal ratings toward each other.
 *
 * @param scores - Mutable map of modelId to current ELO rating
 * @param playerAId - Model ID of player A
 * @param playerBId - Model ID of player B
 * @param winnerId - Model ID of winner, or `null` for a tie (0.5/0.5)
 * @param confidence - Judgment confidence level (determines K-factor)
 */
export function updateElo(
    scores: Map<string, number>,
    playerAId: string,
    playerBId: string,
    winnerId: string | null,
    confidence: JudgmentConfidence,
): void {
    const ratingA = scores.get(playerAId)!;
    const ratingB = scores.get(playerBId)!;

    const expA = expectedScore(ratingA, ratingB);
    const expB = expectedScore(ratingB, ratingA);

    const actualA = winnerId === playerAId ? 1 : winnerId === playerBId ? 0 : 0.5;
    const actualB = winnerId === playerBId ? 1 : winnerId === playerAId ? 0 : 0.5;

    const k = effectiveKFactor(confidence);

    scores.set(playerAId, ratingA + k * (actualA - expA));
    scores.set(playerBId, ratingB + k * (actualB - expB));
}
