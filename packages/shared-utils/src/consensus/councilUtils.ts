import type { Critique, CouncilBranch } from './councilTypes';

/** Builds a prompt instructing a model to critique another model's answer */
export function buildCritiquePrompt(
    originalPrompt: string,
    targetModelName: string,
    targetAnswer: string
): string {
    return `
You are a critical reviewer evaluating an AI model's response.

Original Question: ${originalPrompt}

Response from ${targetModelName}:
${targetAnswer}

Your task:
1. Identify any flaws, inaccuracies, or weakness in this response.
2. Note any strengths or particularly good points.
3. Be specific and constructive in your critique.

Provide your critique concisely.
    `.trim();
}

/** Builds a prompt instructing a model to defend or concede against critiques */
export function buildRebuttalPrompt(
    originalPrompt: string,
    originalAnswer: string,
    critiques: Critique[]
): string {
    const critiquesText = critiques
        .map((c, i) => `Critique ${i + 1}:\n${c.content}`)
        .join('\n\n');

    return `
You are defending your original response against critiques from other AI models.

Original Question: ${originalPrompt}

Your Original Answer:
${originalAnswer}

Critiques received:
${critiquesText}

Your task:
1. Address each critique directly.
2. Defend valid points in your original answer with evidence or reasoning.
3. Concede where critiques are correct and explain how you would improve.
4. Be honest and constructive.

Provide your rebuttal concisely.
    `.trim();
}

/** Builds a prompt instructing a model to vote valid/invalid on a branch as JSON */
export function buildJudgmentPrompt(
    originalPrompt: string,
    branchModelName: string,
    answer: string,
    critiques: Critique[],
    rebuttal: string | null
): string {
    const critiquesText = critiques
        .map((c, i) => `Critique ${i + 1}:\n${c.content}`)
        .join('\n\n');

    const rebuttalText = rebuttal ?? 'No rebuttal provided.';

    return `
You are a judge evaluating whether an AI model's position is valid after debate.

Original Question: ${originalPrompt}

Position from ${branchModelName}:
${answer}

Critiques:
${critiquesText}

Rebuttal:
${rebuttalText}

Evaluate whether this position remains valid after considering the critiques and rebuttal.
Output ONLY valid JSON in this exact format:
{"isValid": true/false, "reasoning": "brief explanation"}

Rules:
- isValid should be true if the position is fundamentally sound despite flaws.
- isValid should be false only if the position is substantially incorrect or misleading.
- No prose outside the JSON object.
    `.trim();
}

/** Builds a prompt to synthesize top-K valid branches into a final answer */
export function buildCouncilSummaryPrompt(
    originalPrompt: string,
    rankedBranches: CouncilBranch[]
): string {
    const branchesText = rankedBranches
        .map((b) => `Rank #${b.rank} - ${b.modelName}:\n${b.initialAnswer}`)
        .join('\n\n---\n\n');

    return `
You are a helpful assistant synthesizing the best AI responses after a council debate.

Original Question: ${originalPrompt}

The following responses survived critical review and are ranked by quality:

${branchesText}

Your task:
Produce a SINGLE, UNIFIED response that directly answers the original question.
Synthesize the best elements from all positions into one coherent, comprehensive answer.
Do NOT compare or reference the individual models. Write as if answering the question yourself.
    `.trim();
}

/** Parses a judgment vote JSON from LLM output, with fallback for unparseable output */
export function parseJudgmentVote(output: string): { isValid: boolean; reasoning: string } {
    const fallback = { isValid: true, reasoning: '' };

    if (!output || output.trim().length === 0) {
        return fallback;
    }

    const trimmed = output.trim();

    // Try direct JSON parse
    const direct = tryParseVoteJson(trimmed);
    if (direct) return direct;

    // Try extracting from markdown code fences
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
        const fenced = tryParseVoteJson(fencedMatch[1].trim());
        if (fenced) return fenced;
    }

    // Unparseable - default to valid
    return fallback;
}

/** Calculates whether a branch is valid based on vote count and threshold */
export function calculateBranchValidity(
    validVoteCount: number,
    totalModels: number,
    threshold: number
): { validVoteCount: number; isValid: boolean } {
    if (totalModels === 0) {
        return { validVoteCount, isValid: false };
    }

    const ratio = validVoteCount / totalModels;
    return {
        validVoteCount,
        isValid: ratio >= threshold,
    };
}

function tryParseVoteJson(text: string): { isValid: boolean; reasoning: string } | null {
    try {
        const parsed = JSON.parse(text) as { isValid?: unknown; reasoning?: unknown };
        if (typeof parsed.isValid === 'boolean') {
            return {
                isValid: parsed.isValid,
                reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
            };
        }
        return null;
    } catch {
        return null;
    }
}
