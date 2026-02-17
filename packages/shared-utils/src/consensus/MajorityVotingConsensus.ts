import type { AIProvider, StreamResponseOptions } from '../providers/types';
import type {
    ConsensusModelResponse,
    ConsensusStrategy,
    RankingResult,
} from './types';
import {
    buildFallbackRankings,
    buildMajorityRankingPrompt,
    buildMajoritySynthesisPrompt,
    parseMajorityVotingOutput,
} from './majorityVotingUtils';

const MIN_RESPONSES_FOR_MAJORITY = 2;

export class MajorityVotingConsensus implements ConsensusStrategy {
    constructor(
        private summarizerProvider: AIProvider,
        private summarizerModelId: string
    ) { }

    async rankResponses(
        responses: ConsensusModelResponse[],
        prompt: string
    ): Promise<RankingResult[]> {
        if (responses.length < MIN_RESPONSES_FOR_MAJORITY) {
            throw new Error('At least 2 responses are required for majority voting');
        }

        const { prompt: rankingPrompt, idMap } = buildMajorityRankingPrompt(responses, prompt);

        try {
            const llmOutput = await this.completePrompt(rankingPrompt);
            const parsed = parseMajorityVotingOutput(llmOutput, responses, idMap);
            return parsed ?? buildFallbackRankings(responses);
        } catch {
            return buildFallbackRankings(responses);
        }
    }

    async generateConsensus(
        responses: ConsensusModelResponse[],
        topN: number,
        prompt: string
    ): Promise<string> {
        if (responses.length < MIN_RESPONSES_FOR_MAJORITY) {
            throw new Error('At least 2 responses are required for majority voting');
        }

        const rankings = await this.rankResponses(responses, prompt);
        const effectiveTopN = topN > 0
            ? Math.min(topN, rankings.length)
            : rankings.length;

        const topModelIds = new Set(
            rankings.slice(0, effectiveTopN).map((item) => item.modelId)
        );

        const selectedResponses = responses.filter((response) =>
            topModelIds.has(response.modelId)
        );

        // Sort by rank order (most aligned first) and anonymize
        const sortedResponses = [...selectedResponses].sort((a, b) => {
            const rankA = rankings.find((item) => item.modelId === a.modelId)?.rank ?? 999;
            const rankB = rankings.find((item) => item.modelId === b.modelId)?.rank ?? 999;
            return rankA - rankB;
        });

        const rankedResponseText = sortedResponses
            .map((response, i) => {
                const result = rankings.find((item) => item.modelId === response.modelId);
                const score = result?.eloScore ?? 0;

                return `Response ${i + 1}\nAlignment Score: ${score}\nResponse:\n${response.content}`;
            })
            .join('\n\n---\n\n');

        const synthesisPrompt = buildMajoritySynthesisPrompt({
            prompt,
            rankedResponseText,
        });

        try {
            return await this.completePrompt(synthesisPrompt);
        } catch {
            return 'Failed to generate summary.';
        }
    }

    private static readonly JUDGE_OPTIONS: StreamResponseOptions = { temperature: 0, seed: 42 };

    private completePrompt(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.summarizerProvider.streamResponse(
                prompt,
                this.summarizerModelId,
                () => { void 0; },
                (finalText: string) => resolve(finalText),
                (err: Error) => reject(err),
                MajorityVotingConsensus.JUDGE_OPTIONS,
            );
        });
    }
}
