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
 * Resolution logic is in {@link eloTypes.resolveSwappedOutcomes}.
 */

import type { AIProvider, ConsensusModelResponse } from '@ensemble-ai/consensus-core';
import type { SingleJudgmentOutcome, PairJudgment } from './eloTypes';
import { mapReversedOutcome, resolveSwappedOutcomes } from './eloTypes';

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
 * Uses the **last** `WINNER:` occurrence to avoid false matches in
 * chain-of-thought reasoning text that may reference the verdict format.
 *
 * @param responseText - Raw text from the judge LLM
 * @returns The parsed outcome ('A', 'B', 'TIE', or 'ERROR') and any reasoning text
 */
export function parseJudgeResponse(responseText: string): {
    outcome: SingleJudgmentOutcome;
    reasoning: string;
} {
    const normalized = responseText.toUpperCase();

    // Find the last WINNER: line — the actual verdict (not a mention in reasoning)
    const lastWinnerIdx = normalized.lastIndexOf('WINNER:');
    if (lastWinnerIdx === -1) {
        return { outcome: 'ERROR', reasoning: '' };
    }

    const reasoning = lastWinnerIdx > 0
        ? responseText.slice(0, lastWinnerIdx).trim()
        : '';

    // Parse only the text after the last WINNER:
    const verdictText = normalized.slice(lastWinnerIdx);

    if (verdictText.startsWith('WINNER: TIE')) {
        return { outcome: 'TIE', reasoning };
    } else if (verdictText.startsWith('WINNER: A')) {
        return { outcome: 'A', reasoning };
    } else if (verdictText.startsWith('WINNER: B')) {
        return { outcome: 'B', reasoning };
    }

    return { outcome: 'ERROR', reasoning: '' };
}

/**
 * Executes a single judge call via the provider's streamResponse API.
 * Uses a double-resolve guard to handle providers that may call both
 * onComplete and onError.
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
        let settled = false;
        provider.streamResponse(
            prompt,
            modelId,
            () => { void 0; },
            (finalText: string) => {
                if (!settled) {
                    settled = true;
                    resolve(parseJudgeResponse(finalText));
                }
            },
            (err: Error) => {
                if (!settled) {
                    settled = true;
                    console.error('Judge error:', err);
                    resolve({ outcome: 'ERROR', reasoning: '' });
                }
            },
        );
    });
}

/**
 * Judges a pair of responses with position-swap debiasing.
 *
 * Runs two judge calls in parallel:
 * - Forward: modelA content in "Model A" position, modelB in "Model B"
 * - Reversed: modelB content in "Model A" position, modelA in "Model B"
 *
 * The two outcomes are resolved into a single judgment with confidence,
 * using the resolution table documented in {@link eloTypes.resolveSwappedOutcomes}.
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
