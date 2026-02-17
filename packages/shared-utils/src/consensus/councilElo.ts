import type { StreamResponseOptions } from '../providers/types';
import type { CouncilParticipant, CouncilBranch } from './councilTypes';
import type { CompletePromptFn } from './councilRounds';

const INITIAL_ELO = 1200;
const K_FACTOR = 32;
const JUDGE_OPTIONS: StreamResponseOptions = { temperature: 0, seed: 42 };

/** Sequential pairwise ELO ranking of valid branches, rotating judges across pairings */
export async function runCouncilEloRanking(
    validBranches: CouncilBranch[],
    prompt: string,
    participants: CouncilParticipant[],
    completePrompt: CompletePromptFn
): Promise<CouncilBranch[]> {
    if (participants.length === 0) return validBranches;

    const eloScores = new Map<string, number>();
    for (const b of validBranches) {
        eloScores.set(b.modelId, INITIAL_ELO);
    }

    const pairings: [CouncilBranch, CouncilBranch][] = [];
    for (let i = 0; i < validBranches.length; i++) {
        for (let j = i + 1; j < validBranches.length; j++) {
            pairings.push([validBranches[i]!, validBranches[j]!]);
        }
    }

    const judgments = await Promise.all(
        pairings.map(async (pair, idx) => {
            const [branchA, branchB] = pair;
            const judge = participants[idx % participants.length]!;
            const winnerId = await judgeEloPair(judge, branchA, branchB, prompt, completePrompt);
            return { winnerId, branchA, branchB };
        }),
    );

    for (const { winnerId, branchA, branchB } of judgments) {
        if (winnerId) {
            updateElo(eloScores, branchA.modelId, branchB.modelId, winnerId);
        }
    }

    for (const b of validBranches) {
        b.eloScore = eloScores.get(b.modelId) ?? INITIAL_ELO;
    }

    validBranches.sort((a, b) => b.eloScore - a.eloScore);
    validBranches.forEach((b, i) => { b.rank = i + 1; });

    return validBranches;
}

function buildBranchContent(branch: CouncilBranch): string {
    let content = branch.initialAnswer;
    if (branch.rebuttal?.content) {
        content += `\n\nRebuttal:\n${branch.rebuttal.content}`;
    }
    return content;
}

async function judgeEloPair(
    judge: CouncilParticipant,
    branchA: CouncilBranch,
    branchB: CouncilBranch,
    originalPrompt: string,
    completePrompt: CompletePromptFn
): Promise<string | null> {
    const prompt = `
You are an impartial evaluator selecting the more correct answer.

Original Question:
${originalPrompt}

Response A:
${buildBranchContent(branchA)}

Response B:
${buildBranchContent(branchB)}

Decision rules:
- Choose the answer that is more factually correct and better follows the question constraints.
- If both are equally valid, select TIE.
- Ignore style, verbosity, and confidence wording.

Before deciding, briefly compare both answers in 2-3 sentences. Then output your verdict on a new line.
Output exactly one of:
- WINNER: A
- WINNER: B
- WINNER: TIE
    `.trim();

    try {
        const output = await completePrompt(judge.provider, judge.modelApiId, prompt, JUDGE_OPTIONS);
        const normalized = output.toUpperCase();
        if (normalized.includes('WINNER: A')) return branchA.modelId;
        if (normalized.includes('WINNER: B')) return branchB.modelId;
        return null;
    } catch {
        return null;
    }
}

function updateElo(
    scores: Map<string, number>,
    playerAId: string,
    playerBId: string,
    winnerId: string
): void {
    const ratingA = scores.get(playerAId)!;
    const ratingB = scores.get(playerBId)!;

    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

    const actualA = winnerId === playerAId ? 1 : 0;
    const actualB = winnerId === playerBId ? 1 : 0;

    scores.set(playerAId, ratingA + K_FACTOR * (actualA - expectedA));
    scores.set(playerBId, ratingB + K_FACTOR * (actualB - expectedB));
}
