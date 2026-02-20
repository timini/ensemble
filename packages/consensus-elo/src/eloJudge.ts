/**
 * @module consensus-elo/eloJudge
 *
 * Judge logic for pairwise comparisons with position-swap debiasing.
 *
 * For each pair of responses, the judge is called **twice** in parallel:
 * - Forward: modelA in position A, modelB in position B
 * - Reversed: modelB in position A, modelA in position B
 *
 * This detects and mitigates position bias (research shows 18-43% of
 * LLM judge verdicts flip when response order is reversed).
 *
 * Resolution table:
 * | Forward | Reversed (mapped back) | Result         | Confidence |
 * |---------|------------------------|----------------|------------|
 * | A wins  | A wins (consistent)    | A wins         | HIGH       |
 * | A wins  | B wins (contradictory) | TIE            | LOW        |
 * | A wins  | TIE                    | A wins         | LOW        |
 * | TIE     | TIE                    | TIE            | HIGH       |
 * | Error   | Valid                  | Use valid      | LOW        |
 * | Error   | Error                  | null (skip)    | -          |
 */

import type { AIProvider, ConsensusModelResponse } from '@ensemble-ai/consensus-core';
import type { SingleJudgmentOutcome, PairJudgment, JudgmentConfidence } from './eloTypes';

/**
 * Builds the judge prompt for a pairwise comparison.
 * Includes chain-of-thought instruction requesting brief reasoning before the verdict.
 *
 * @param modelAContent - Response content placed in the "Model A" position
 * @param modelBContent - Response content placed in the "Model B" position
 * @param originalPrompt - The original user question
 * @returns The complete judge prompt string
 */
export function buildJudgePrompt(
    modelAContent: string,
    modelBContent: string,
    originalPrompt: string,
): string {
    return `You are an impartial evaluator selecting the more correct answer.

Original Question:
${originalPrompt}

Model A:
${modelAContent}

Model B:
${modelBContent}

Decision rules:
- Choose the answer that is more factually correct and better follows the question constraints.
- If both are equally valid, select TIE.
- Ignore style, verbosity, and confidence wording.

First, briefly explain your reasoning (1-2 sentences).
Then output your decision on a new line as exactly one of:
WINNER: A
WINNER: B
WINNER: TIE`;
}

/**
 * Parses a judge response to extract the outcome and optional reasoning.
 * Reasoning is everything before the last `WINNER:` line.
 *
 * @param responseText - Raw text from the judge LLM
 * @returns The parsed outcome ('A', 'B', 'TIE', or 'ERROR') and any reasoning text
 */
export function parseJudgeResponse(responseText: string): {
    outcome: SingleJudgmentOutcome;
    reasoning: string;
} {
    const normalized = responseText.toUpperCase();

    // Extract reasoning: everything before the last WINNER: line
    const lastWinnerIdx = responseText.toUpperCase().lastIndexOf('WINNER:');
    const reasoning = lastWinnerIdx > 0
        ? responseText.slice(0, lastWinnerIdx).trim()
        : '';

    if (normalized.includes('WINNER: A')) {
        return { outcome: 'A', reasoning };
    } else if (normalized.includes('WINNER: B')) {
        return { outcome: 'B', reasoning };
    } else if (normalized.includes('WINNER: TIE')) {
        return { outcome: 'TIE', reasoning };
    }

    return { outcome: 'ERROR', reasoning: '' };
}

/**
 * Executes a single judge call via the provider's streamResponse API.
 *
 * @param provider - The AI provider to use for the judge call
 * @param modelId - The model ID to use for judging
 * @param prompt - The judge prompt
 * @returns The outcome and reasoning, or ERROR on failure
 */
async function executeSingleJudgment(
    provider: AIProvider,
    modelId: string,
    prompt: string,
): Promise<{ outcome: SingleJudgmentOutcome; reasoning: string }> {
    return new Promise((resolve) => {
        provider.streamResponse(
            prompt,
            modelId,
            () => { void 0; },
            (finalText: string) => resolve(parseJudgeResponse(finalText)),
            (err: Error) => {
                console.error('Judge error:', err);
                resolve({ outcome: 'ERROR', reasoning: '' });
            },
        );
    });
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

/**
 * Judges a pair of responses with position-swap debiasing.
 *
 * Runs two judge calls in parallel:
 * - Forward: modelA content in "Model A" position, modelB in "Model B"
 * - Reversed: modelB content in "Model A" position, modelA in "Model B"
 *
 * The two outcomes are resolved into a single judgment with confidence,
 * using the resolution table documented in the module header.
 *
 * @param provider - The AI provider for judge calls
 * @param modelId - The judge model ID
 * @param modelA - First response in the pair
 * @param modelB - Second response in the pair
 * @param originalPrompt - The original user question
 * @returns A {@link PairJudgment} with winner, confidence, and reasoning
 */
export async function judgePairWithSwap(
    provider: AIProvider,
    modelId: string,
    modelA: ConsensusModelResponse,
    modelB: ConsensusModelResponse,
    originalPrompt: string,
): Promise<PairJudgment> {
    const forwardPrompt = buildJudgePrompt(modelA.content, modelB.content, originalPrompt);
    const reversedPrompt = buildJudgePrompt(modelB.content, modelA.content, originalPrompt);

    // Run both calls in parallel for minimal latency impact
    const [forwardResult, reversedResult] = await Promise.all([
        executeSingleJudgment(provider, modelId, forwardPrompt),
        executeSingleJudgment(provider, modelId, reversedPrompt),
    ]);

    // Map reversed outcome back to original pair order
    const mappedReversed = mapReversedOutcome(reversedResult.outcome);

    const resolution = resolveSwappedOutcomes(forwardResult.outcome, mappedReversed);

    if (!resolution) {
        // Double error — skip this pair
        return { winnerId: null, confidence: undefined };
    }

    const winnerId =
        resolution.winner === 'A' ? modelA.modelId :
            resolution.winner === 'B' ? modelB.modelId :
                null;

    return {
        winnerId,
        confidence: resolution.confidence,
        reasoning: {
            forward: forwardResult.reasoning,
            reversed: reversedResult.reasoning,
        },
    };
}
