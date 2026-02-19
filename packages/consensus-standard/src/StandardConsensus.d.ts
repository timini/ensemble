import type { AIProvider, ConsensusModelResponse, ConsensusStrategy, RankingResult } from '@ensemble-ai/consensus-core';
export declare class StandardConsensus implements ConsensusStrategy {
    private summarizerProvider;
    private summarizerModelId;
    constructor(summarizerProvider: AIProvider, summarizerModelId: string);
    /**
     * Standard consensus does not rank responses, but returns a dummy valid ranking (or 0 rank) if forced.
     * In the UI, if Standard is selected, we might not show ranking.
     */
    rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]>;
    generateConsensus(responses: ConsensusModelResponse[], topN: number, originalPrompt: string): Promise<string>;
}
//# sourceMappingURL=StandardConsensus.d.ts.map