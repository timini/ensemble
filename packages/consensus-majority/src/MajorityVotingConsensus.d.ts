import type { AIProvider, ConsensusModelResponse, ConsensusStrategy, RankingResult } from '@ensemble-ai/consensus-core';
export declare class MajorityVotingConsensus implements ConsensusStrategy {
    private summarizerProvider;
    private summarizerModelId;
    constructor(summarizerProvider: AIProvider, summarizerModelId: string);
    rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]>;
    generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string>;
    private completePrompt;
}
//# sourceMappingURL=MajorityVotingConsensus.d.ts.map