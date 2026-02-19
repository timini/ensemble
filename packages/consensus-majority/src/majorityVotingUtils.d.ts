import type { ConsensusModelResponse, RankingResult } from '@ensemble-ai/consensus-core';
export declare function buildMajorityRankingPrompt(responses: ConsensusModelResponse[], originalPrompt: string): string;
export declare function buildMajoritySynthesisPrompt(params: {
    prompt: string;
    rankedResponseText: string;
    majorityModel: string | undefined;
}): string;
export declare function parseMajorityVotingOutput(output: string, responses: ConsensusModelResponse[]): RankingResult[] | null;
export declare function buildFallbackRankings(responses: ConsensusModelResponse[]): RankingResult[];
//# sourceMappingURL=majorityVotingUtils.d.ts.map