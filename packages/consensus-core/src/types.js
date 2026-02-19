// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------
/** Narrows an {@link EnsembleResult} to {@link StandardConsensusResult}. */
export function isStandardResult(result) {
    return result.type === 'standard';
}
/** Narrows an {@link EnsembleResult} to {@link EloRankingResult}. */
export function isEloResult(result) {
    return result.type === 'elo';
}
/** Narrows an {@link EnsembleResult} to {@link MajorityVotingResult}. */
export function isMajorityResult(result) {
    return result.type === 'majority';
}
/** Narrows an {@link EnsembleResult} to {@link LLMCouncilResult}. */
export function isCouncilResult(result) {
    return result.type === 'council';
}
