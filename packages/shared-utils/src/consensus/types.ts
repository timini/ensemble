
export interface ConsensusModelResponse {
    modelId: string;
    modelName: string; // "model" in ModelResponse
    content: string;   // "response" in ModelResponse
}

export interface Pairing {
    modelA: ConsensusModelResponse;
    modelB: ConsensusModelResponse;
}

export interface RankingResult {
    modelId: string;
    eloScore: number;
    rank: number;
}

export interface ConsensusStrategy {
    rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]>;
    generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string>;
}
