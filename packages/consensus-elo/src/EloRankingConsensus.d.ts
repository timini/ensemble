import type { AIProvider, ConsensusModelResponse, ConsensusStrategy, RankingResult } from '@ensemble-ai/consensus-core';
export declare class EloRankingConsensus implements ConsensusStrategy {
    private judgeProvider;
    private judgeModelId;
    private summarizerProvider;
    private summarizerModelId;
    private static readonly K_FACTOR;
    private static readonly INITIAL_ELO;
    constructor(judgeProvider: AIProvider, judgeModelId: string, summarizerProvider: AIProvider, summarizerModelId: string);
    /**
     * Ranks responses using an ELO rating system based on pairwise comparisons judged by an LLM.
     * Requires at least 3 responses.
     */
    rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]>;
    generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string>;
    private summarizeResponses;
    private generatePairings;
    private judgePair;
    private updateElo;
}
//# sourceMappingURL=EloRankingConsensus.d.ts.map