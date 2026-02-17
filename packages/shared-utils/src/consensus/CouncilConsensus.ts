import type { AIProvider, StreamResponseOptions } from '../providers/types';
import type { ConsensusModelResponse, ConsensusStrategy, RankingResult } from './types';
import type {
    CouncilParticipant,
    CouncilBranch,
    CouncilDebateTree,
    CouncilProgressCallback,
} from './councilTypes';
import { buildCouncilSummaryPrompt } from './councilUtils';
import { runCritiqueRound, runRebuttalRound, runJudgmentRound } from './councilRounds';
import { runCouncilEloRanking } from './councilElo';

const MIN_RESPONSES = 3;
const DEFAULT_VALIDITY_THRESHOLD = 0.5;
const DEFAULT_TOP_K = 3;
const INITIAL_ELO = 1200;

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
        return tree.rankings.map((b) => ({ modelId: b.modelId, eloScore: b.eloScore, rank: b.rank }));
    }

    async generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string> {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }

        const effectiveTopK = topN > 0 ? topN : this.topK;
        return (await this.runPipeline(responses, prompt, effectiveTopK)).summary;
    }

    async generateConsensusWithDebateTree(
        responses: ConsensusModelResponse[], topN: number, prompt: string
    ): Promise<CouncilDebateTree> {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }

        return this.runPipeline(responses, prompt, topN > 0 ? topN : this.topK);
    }

    getLastDebateTree(): CouncilDebateTree | null {
        return this.lastDebateTree;
    }

    private async runPipeline(
        responses: ConsensusModelResponse[], prompt: string, topK?: number
    ): Promise<CouncilDebateTree> {
        const startTime = Date.now();
        const effectiveTopK = topK ?? this.topK;
        const find = this.findParticipant.bind(this);
        const complete = this.completePrompt;

        const branches: CouncilBranch[] = responses.map((r) => ({
            modelId: r.modelId, modelName: r.modelName, initialAnswer: r.content,
            critiques: [], rebuttal: null, votes: [],
            validVoteCount: 0, isValid: false, eloScore: INITIAL_ELO, rank: 0,
        }));

        // Step 1: Critiques
        this.onProgress?.({ round: 'critique', progress: 0, message: 'Running critique round...' });
        await runCritiqueRound(branches, prompt, find, complete);
        this.onProgress?.({ round: 'critique', progress: 1, message: 'Critique round complete.' });

        // Step 2: Rebuttals
        this.onProgress?.({ round: 'rebuttal', progress: 0, message: 'Running rebuttal round...' });
        await runRebuttalRound(branches, prompt, find, complete);
        this.onProgress?.({ round: 'rebuttal', progress: 1, message: 'Rebuttal round complete.' });

        // Step 3: Judgment
        this.onProgress?.({ round: 'judgment', progress: 0, message: 'Running judgment round...' });
        await runJudgmentRound(branches, prompt, find, complete, this.validityThreshold);
        this.onProgress?.({ round: 'judgment', progress: 1, message: 'Judgment round complete.' });

        // Filter invalid branches, fallback if all are invalid
        let validBranches = branches.filter((b) => b.isValid);
        if (validBranches.length === 0) {
            validBranches = branches.map((b) => ({ ...b, isValid: true }));
        }

        // Step 4: ELO ranking
        this.onProgress?.({ round: 'elo', progress: 0, message: 'Running ELO ranking...' });
        const rankedBranches = await runCouncilEloRanking(validBranches, prompt, this.participants, complete);
        this.onProgress?.({ round: 'elo', progress: 1, message: 'ELO ranking complete.' });

        // Step 5: Summarize top-K
        this.onProgress?.({ round: 'summary', progress: 0, message: 'Generating summary...' });
        const summary = await this.summarizeTopBranches(rankedBranches.slice(0, effectiveTopK), prompt);
        this.onProgress?.({ round: 'summary', progress: 1, message: 'Summary complete.' });

        const tree: CouncilDebateTree = {
            originalPrompt: prompt, branches, validBranches, rankings: rankedBranches, summary,
            metadata: {
                totalModels: responses.length, validBranchCount: validBranches.length,
                validityThreshold: this.validityThreshold, topK: effectiveTopK,
                durationMs: Date.now() - startTime,
            },
        };

        this.lastDebateTree = tree;
        return tree;
    }

    private async summarizeTopBranches(branches: CouncilBranch[], prompt: string): Promise<string> {
        try {
            return await this.completePrompt(
                this.summarizerProvider, this.summarizerModelId, buildCouncilSummaryPrompt(prompt, branches)
            );
        } catch {
            return 'Failed to generate council summary.';
        }
    }

    private completePrompt(provider: AIProvider, modelId: string, prompt: string, options?: StreamResponseOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            provider.streamResponse(
                prompt, modelId,
                () => { void 0; },
                (finalText: string) => resolve(finalText),
                (err: Error) => reject(err),
                options,
            );
        });
    }

    private findParticipant(modelId: string): CouncilParticipant | undefined {
        return this.participants.find((p) => p.modelId === modelId);
    }
}
