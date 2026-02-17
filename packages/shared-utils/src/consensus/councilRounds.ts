import type { AIProvider } from '../providers/types';
import type { CouncilParticipant, CouncilBranch, Critique, BranchVote } from './councilTypes';
import {
    buildCritiquePrompt,
    buildRebuttalPrompt,
    buildJudgmentPrompt,
    parseJudgmentVote,
    calculateBranchValidity,
} from './councilUtils';

export type CompletePromptFn = (provider: AIProvider, modelId: string, prompt: string) => Promise<string>;
export type FindParticipantFn = (modelId: string) => CouncilParticipant | undefined;

/** N*(N-1) parallel critique calls — each model critiques every other model */
export async function runCritiqueRound(
    branches: CouncilBranch[],
    prompt: string,
    findParticipant: FindParticipantFn,
    completePrompt: CompletePromptFn
): Promise<CouncilBranch[]> {
    const tasks: Promise<Critique | null>[] = [];

    for (const target of branches) {
        for (const critic of branches) {
            if (critic.modelId === target.modelId) continue;

            const participant = findParticipant(critic.modelId);
            if (!participant) continue;

            const critiquePrompt = buildCritiquePrompt(prompt, target.modelName, target.initialAnswer);

            tasks.push(
                completePrompt(participant.provider, participant.modelApiId, critiquePrompt)
                    .then((content): Critique => ({
                        criticModelId: critic.modelId,
                        targetModelId: target.modelId,
                        content,
                    }))
                    .catch((): null => null)
            );
        }
    }

    const results = await Promise.allSettled(tasks);

    for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const critique = result.value;
        const branch = branches.find((b) => b.modelId === critique.targetModelId);
        if (branch) branch.critiques.push(critique);
    }

    return branches;
}

/** N parallel rebuttal calls — each model responds to critiques of its answer */
export async function runRebuttalRound(
    branches: CouncilBranch[],
    prompt: string,
    findParticipant: FindParticipantFn,
    completePrompt: CompletePromptFn
): Promise<CouncilBranch[]> {
    const tasks = branches.map(async (branch) => {
        if (branch.critiques.length === 0) return;

        const participant = findParticipant(branch.modelId);
        if (!participant) return;

        const rebuttalPrompt = buildRebuttalPrompt(prompt, branch.initialAnswer, branch.critiques);

        try {
            const content = await completePrompt(participant.provider, participant.modelApiId, rebuttalPrompt);
            branch.rebuttal = { authorModelId: branch.modelId, content };
        } catch {
            // Failed rebuttal — continue without it
        }
    });

    await Promise.allSettled(tasks);
    return branches;
}

/** N*(N-1) parallel judgment calls — each model votes on every other model's branch */
export async function runJudgmentRound(
    branches: CouncilBranch[],
    prompt: string,
    findParticipant: FindParticipantFn,
    completePrompt: CompletePromptFn,
    validityThreshold: number
): Promise<CouncilBranch[]> {
    const tasks: Promise<BranchVote | null>[] = [];

    for (const branch of branches) {
        for (const voter of branches) {
            if (voter.modelId === branch.modelId) continue;

            const participant = findParticipant(voter.modelId);
            if (!participant) continue;

            const judgmentPrompt = buildJudgmentPrompt(
                prompt, branch.modelName, branch.initialAnswer,
                branch.critiques, branch.rebuttal?.content ?? null
            );

            tasks.push(
                completePrompt(participant.provider, participant.modelApiId, judgmentPrompt)
                    .then((output): BranchVote => {
                        const vote = parseJudgmentVote(output);
                        return {
                            voterModelId: voter.modelId,
                            branchModelId: branch.modelId,
                            isValid: vote.isValid,
                            reasoning: vote.reasoning,
                        };
                    })
                    .catch((): null => null)
            );
        }
    }

    const results = await Promise.allSettled(tasks);

    for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const vote = result.value;
        const branch = branches.find((b) => b.modelId === vote.branchModelId);
        if (branch) branch.votes.push(vote);
    }

    const totalVotersPerBranch = branches.length - 1;
    for (const branch of branches) {
        const validVotes = branch.votes.filter((v) => v.isValid).length;
        const validity = calculateBranchValidity(validVotes, totalVotersPerBranch, validityThreshold);
        branch.validVoteCount = validity.validVoteCount;
        branch.isValid = validity.isValid;
    }

    return branches;
}
