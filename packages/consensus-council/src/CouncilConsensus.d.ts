import type { AIProvider, ConsensusModelResponse, ConsensusStrategy, RankingResult } from '@ensemble-ai/consensus-core';
import type { CouncilParticipant, CouncilDebateTree, CouncilProgressCallback } from './councilTypes';
export interface CouncilConsensusConfig {
    participants: CouncilParticipant[];
    summarizerProvider: AIProvider;
    summarizerModelId: string;
    validityThreshold?: number;
    topK?: number;
    onProgress?: CouncilProgressCallback;
}
export declare class CouncilConsensus implements ConsensusStrategy {
    private participants;
    private summarizerProvider;
    private summarizerModelId;
    private validityThreshold;
    private topK;
    private onProgress?;
    private lastDebateTree;
    constructor(config: CouncilConsensusConfig);
    rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]>;
    generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string>;
    generateConsensusWithDebateTree(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<CouncilDebateTree>;
    getLastDebateTree(): CouncilDebateTree | null;
    private runPipeline;
    private summarizeTopBranches;
    private completePrompt;
    private findParticipant;
}
//# sourceMappingURL=CouncilConsensus.d.ts.map