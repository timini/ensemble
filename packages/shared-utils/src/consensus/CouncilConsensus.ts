import type { AIProvider } from '../providers/types';
import type { ConsensusModelResponse, ConsensusStrategy, RankingResult } from './types';
import type {
    CouncilParticipant,
    CouncilBranch,
    CouncilDebateTree,
    CouncilProgressCallback,
    Critique,
    BranchVote,
} from './councilTypes';
import {
    buildCritiquePrompt,
    buildRebuttalPrompt,
    buildJudgmentPrompt,
    buildCouncilSummaryPrompt,
    parseJudgmentVote,
    calculateBranchValidity,
} from './councilUtils';

const MIN_RESPONSES = 3;
const DEFAULT_VALIDITY_THRESHOLD = 0.5;
const DEFAULT_TOP_K = 3;
const INITIAL_ELO = 1200;
const K_FACTOR = 32;

export interface CouncilConsensusConfig {
    participants: CouncilParticipant[];
    summarizerProvider: AIProvider;
    summarizerModelId: string;
    validityThreshold?: number;
    topK?: number;
    onProgress?: CouncilProgressCallback;
}

export class CouncilConsensus implements ConsensusStrategy {
    private participants: CouncilParticipant[];
    private summarizerProvider: AIProvider;
    private summarizerModelId: string;
    private validityThreshold: number;
    private topK: number;
    private onProgress?: CouncilProgressCallback;
    private lastDebateTree: CouncilDebateTree | null = null;

    constructor(config: CouncilConsensusConfig) {
        this.participants = config.participants;
        this.summarizerProvider = config.summarizerProvider;
        this.summarizerModelId = config.summarizerModelId;
        this.validityThreshold = config.validityThreshold ?? DEFAULT_VALIDITY_THRESHOLD;
        this.topK = config.topK ?? DEFAULT_TOP_K;
        this.onProgress = config.onProgress;
    }

    async rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]> {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }

        const tree = await this.runPipeline(responses, prompt);

        return tree.rankings.map((b) => ({
            modelId: b.modelId,
            eloScore: b.eloScore,
            rank: b.rank,
        }));
    }

    async generateConsensus(
        responses: ConsensusModelResponse[],
        topN: number,
        prompt: string
    ): Promise<string> {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }

        const effectiveTopK = topN > 0 ? topN : this.topK;
        const tree = await this.runPipeline(responses, prompt, effectiveTopK);
        return tree.summary;
    }

    async generateConsensusWithDebateTree(
        responses: ConsensusModelResponse[],
        topN: number,
        prompt: string
    ): Promise<CouncilDebateTree> {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }

        const effectiveTopK = topN > 0 ? topN : this.topK;
        return this.runPipeline(responses, prompt, effectiveTopK);
    }

    getLastDebateTree(): CouncilDebateTree | null {
        return this.lastDebateTree;
    }

    private async runPipeline(
        responses: ConsensusModelResponse[],
        prompt: string,
        topK?: number
    ): Promise<CouncilDebateTree> {
        const startTime = Date.now();
        const effectiveTopK = topK ?? this.topK;

        // Initialize branches from responses
        let branches: CouncilBranch[] = responses.map((r) => ({
            modelId: r.modelId,
            modelName: r.modelName,
            initialAnswer: r.content,
            critiques: [],
            rebuttal: null,
            votes: [],
            validVoteCount: 0,
            isValid: false,
            eloScore: INITIAL_ELO,
            rank: 0,
        }));

        // Round 2: Critiques
        this.onProgress?.({ round: 'critique', progress: 0, message: 'Running critique round...' });
        branches = await this.runCritiqueRound(branches, prompt);
        this.onProgress?.({ round: 'critique', progress: 1, message: 'Critique round complete.' });

        // Round 3: Rebuttals
        this.onProgress?.({ round: 'rebuttal', progress: 0, message: 'Running rebuttal round...' });
        branches = await this.runRebuttalRound(branches, prompt);
        this.onProgress?.({ round: 'rebuttal', progress: 1, message: 'Rebuttal round complete.' });

        // Round 4: Judgment
        this.onProgress?.({ round: 'judgment', progress: 0, message: 'Running judgment round...' });
        branches = await this.runJudgmentRound(branches, prompt);
        this.onProgress?.({ round: 'judgment', progress: 1, message: 'Judgment round complete.' });

        // Filter: discard branches with ≤50% valid votes
        let validBranches = this.filterBranches(branches);

        // Fallback: if all branches are invalid, keep them all
        if (validBranches.length === 0) {
            validBranches = branches.map((b) => ({ ...b, isValid: true }));
            branches = validBranches;
        }

        // ELO rank valid branches
        this.onProgress?.({ round: 'elo', progress: 0, message: 'Running ELO ranking...' });
        const rankedBranches = await this.runEloRanking(validBranches, prompt);
        this.onProgress?.({ round: 'elo', progress: 1, message: 'ELO ranking complete.' });

        // Summarize top-K
        this.onProgress?.({ round: 'summary', progress: 0, message: 'Generating summary...' });
        const topBranches = rankedBranches.slice(0, effectiveTopK);
        const summary = await this.summarizeTopBranches(topBranches, prompt);
        this.onProgress?.({ round: 'summary', progress: 1, message: 'Summary complete.' });

        const tree: CouncilDebateTree = {
            originalPrompt: prompt,
            branches,
            validBranches,
            rankings: rankedBranches,
            summary,
            metadata: {
                totalModels: responses.length,
                validBranchCount: validBranches.length,
                validityThreshold: this.validityThreshold,
                topK: effectiveTopK,
                durationMs: Date.now() - startTime,
            },
        };

        this.lastDebateTree = tree;
        return tree;
    }

    /** N*(N-1) parallel critique calls */
    private async runCritiqueRound(
        branches: CouncilBranch[],
        prompt: string
    ): Promise<CouncilBranch[]> {
        const tasks: Promise<Critique | null>[] = [];

        for (const target of branches) {
            for (const critic of branches) {
                if (critic.modelId === target.modelId) continue;

                const participant = this.findParticipant(critic.modelId);
                if (!participant) continue;

                const critiquePrompt = buildCritiquePrompt(
                    prompt,
                    target.modelName,
                    target.initialAnswer
                );

                tasks.push(
                    this.completePrompt(participant.provider, participant.modelApiId, critiquePrompt)
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

        // Attach critiques to branches
        for (const result of results) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const critique = result.value;
            const branch = branches.find((b) => b.modelId === critique.targetModelId);
            if (branch) {
                branch.critiques.push(critique);
            }
        }

        return branches;
    }

    /** N parallel rebuttal calls */
    private async runRebuttalRound(
        branches: CouncilBranch[],
        prompt: string
    ): Promise<CouncilBranch[]> {
        const tasks = branches.map(async (branch) => {
            if (branch.critiques.length === 0) return;

            const participant = this.findParticipant(branch.modelId);
            if (!participant) return;

            const rebuttalPrompt = buildRebuttalPrompt(
                prompt,
                branch.initialAnswer,
                branch.critiques
            );

            try {
                const content = await this.completePrompt(
                    participant.provider,
                    participant.modelApiId,
                    rebuttalPrompt
                );
                branch.rebuttal = { authorModelId: branch.modelId, content };
            } catch {
                // Failed rebuttal - continue without it
            }
        });

        await Promise.allSettled(tasks);
        return branches;
    }

    /** N*N parallel judgment calls */
    private async runJudgmentRound(
        branches: CouncilBranch[],
        prompt: string
    ): Promise<CouncilBranch[]> {
        const tasks: Promise<BranchVote | null>[] = [];

        for (const branch of branches) {
            for (const voter of branches) {
                const participant = this.findParticipant(voter.modelId);
                if (!participant) continue;

                const judgmentPrompt = buildJudgmentPrompt(
                    prompt,
                    branch.modelName,
                    branch.initialAnswer,
                    branch.critiques,
                    branch.rebuttal?.content ?? null
                );

                tasks.push(
                    this.completePrompt(participant.provider, participant.modelApiId, judgmentPrompt)
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

        // Attach votes and calculate validity
        for (const result of results) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const vote = result.value;
            const branch = branches.find((b) => b.modelId === vote.branchModelId);
            if (branch) {
                branch.votes.push(vote);
            }
        }

        // Calculate validity for each branch
        const totalModels = branches.length;
        for (const branch of branches) {
            const validVotes = branch.votes.filter((v) => v.isValid).length;
            const validity = calculateBranchValidity(validVotes, totalModels, this.validityThreshold);
            branch.validVoteCount = validity.validVoteCount;
            branch.isValid = validity.isValid;
        }

        return branches;
    }

    /** Filter branches that don't meet the validity threshold */
    private filterBranches(branches: CouncilBranch[]): CouncilBranch[] {
        return branches.filter((b) => b.isValid);
    }

    /** Sequential pairwise ELO ranking of valid branches */
    private async runEloRanking(
        validBranches: CouncilBranch[],
        prompt: string
    ): Promise<CouncilBranch[]> {
        const eloScores = new Map<string, number>();
        for (const b of validBranches) {
            eloScores.set(b.modelId, INITIAL_ELO);
        }

        // Generate all pairings
        const pairings: [CouncilBranch, CouncilBranch][] = [];
        for (let i = 0; i < validBranches.length; i++) {
            for (let j = i + 1; j < validBranches.length; j++) {
                pairings.push([validBranches[i]!, validBranches[j]!]);
            }
        }

        // Sequential pairwise comparisons using the first participant as judge
        const judge = this.participants[0];
        if (!judge) return validBranches;

        for (const [branchA, branchB] of pairings) {
            const winnerId = await this.judgeEloPair(
                judge,
                branchA,
                branchB,
                prompt
            );

            if (winnerId) {
                this.updateElo(eloScores, branchA.modelId, branchB.modelId, winnerId);
            }
        }

        // Apply scores and sort
        for (const b of validBranches) {
            b.eloScore = eloScores.get(b.modelId) ?? INITIAL_ELO;
        }

        validBranches.sort((a, b) => b.eloScore - a.eloScore);
        validBranches.forEach((b, i) => {
            b.rank = i + 1;
        });

        return validBranches;
    }

    private async judgeEloPair(
        judge: CouncilParticipant,
        branchA: CouncilBranch,
        branchB: CouncilBranch,
        originalPrompt: string
    ): Promise<string | null> {
        const prompt = `
You are an impartial judge evaluating two AI responses.
Question: ${originalPrompt}

Response A (from ${branchA.modelName}):
${branchA.initialAnswer}

Response B (from ${branchB.modelName}):
${branchB.initialAnswer}

Which response is better? Reply EXACTLY with "Winner: ${branchA.modelName}" or "Winner: ${branchB.modelName}". If it is a tie, reply "Winner: Tie".
        `.trim();

        try {
            const output = await this.completePrompt(judge.provider, judge.modelApiId, prompt);
            if (output.includes(`Winner: ${branchA.modelName}`)) {
                return branchA.modelId;
            } else if (output.includes(`Winner: ${branchB.modelName}`)) {
                return branchB.modelId;
            }
            return null;
        } catch {
            return null;
        }
    }

    private updateElo(
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

    /** Summarize top-K branches into a final answer */
    private async summarizeTopBranches(
        branches: CouncilBranch[],
        prompt: string
    ): Promise<string> {
        const summaryPrompt = buildCouncilSummaryPrompt(prompt, branches);
        try {
            return await this.completePrompt(
                this.summarizerProvider,
                this.summarizerModelId,
                summaryPrompt
            );
        } catch {
            return 'Failed to generate council summary.';
        }
    }

    /** Wraps streamResponse in a Promise */
    private completePrompt(provider: AIProvider, modelId: string, prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            provider.streamResponse(
                prompt,
                modelId,
                () => { void 0; },
                (finalText: string) => resolve(finalText),
                (err: Error) => reject(err)
            );
        });
    }

    private findParticipant(modelId: string): CouncilParticipant | undefined {
        return this.participants.find((p) => p.modelId === modelId);
    }
}
