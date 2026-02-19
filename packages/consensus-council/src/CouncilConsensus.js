import { buildCouncilSummaryPrompt } from './councilUtils';
import { runCritiqueRound, runRebuttalRound, runJudgmentRound } from './councilRounds';
import { runCouncilEloRanking } from './councilElo';
const MIN_RESPONSES = 3;
const DEFAULT_VALIDITY_THRESHOLD = 0.5;
const DEFAULT_TOP_K = 3;
const INITIAL_ELO = 1200;
export class CouncilConsensus {
    participants;
    summarizerProvider;
    summarizerModelId;
    validityThreshold;
    topK;
    onProgress;
    lastDebateTree = null;
    constructor(config) {
        this.participants = config.participants;
        this.summarizerProvider = config.summarizerProvider;
        this.summarizerModelId = config.summarizerModelId;
        this.validityThreshold = config.validityThreshold ?? DEFAULT_VALIDITY_THRESHOLD;
        this.topK = config.topK ?? DEFAULT_TOP_K;
        this.onProgress = config.onProgress;
    }
    async rankResponses(responses, prompt) {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }
        const tree = await this.runPipeline(responses, prompt);
        return tree.rankings.map((b) => ({ modelId: b.modelId, eloScore: b.eloScore, rank: b.rank }));
    }
    async generateConsensus(responses, topN, prompt) {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }
        const effectiveTopK = topN > 0 ? topN : this.topK;
        return (await this.runPipeline(responses, prompt, effectiveTopK)).summary;
    }
    async generateConsensusWithDebateTree(responses, topN, prompt) {
        if (responses.length < MIN_RESPONSES) {
            throw new Error('At least 3 responses are required for council consensus');
        }
        return this.runPipeline(responses, prompt, topN > 0 ? topN : this.topK);
    }
    getLastDebateTree() {
        return this.lastDebateTree;
    }
    async runPipeline(responses, prompt, topK) {
        const startTime = Date.now();
        const effectiveTopK = topK ?? this.topK;
        const find = this.findParticipant.bind(this);
        const complete = this.completePrompt;
        const branches = responses.map((r) => ({
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
        const tree = {
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
    async summarizeTopBranches(branches, prompt) {
        try {
            return await this.completePrompt(this.summarizerProvider, this.summarizerModelId, buildCouncilSummaryPrompt(prompt, branches));
        }
        catch {
            return 'Failed to generate council summary.';
        }
    }
    completePrompt(provider, modelId, prompt) {
        return new Promise((resolve, reject) => {
            provider.streamResponse(prompt, modelId, () => { void 0; }, (finalText) => resolve(finalText), (err) => reject(err));
        });
    }
    findParticipant(modelId) {
        return this.participants.find((p) => p.modelId === modelId);
    }
}
