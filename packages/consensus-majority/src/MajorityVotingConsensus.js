import { buildFallbackRankings, buildMajorityRankingPrompt, buildMajoritySynthesisPrompt, parseMajorityVotingOutput, } from './majorityVotingUtils';
const MIN_RESPONSES_FOR_MAJORITY = 2;
export class MajorityVotingConsensus {
    summarizerProvider;
    summarizerModelId;
    constructor(summarizerProvider, summarizerModelId) {
        this.summarizerProvider = summarizerProvider;
        this.summarizerModelId = summarizerModelId;
    }
    async rankResponses(responses, prompt) {
        if (responses.length < MIN_RESPONSES_FOR_MAJORITY) {
            throw new Error('At least 2 responses are required for majority voting');
        }
        const rankingPrompt = buildMajorityRankingPrompt(responses, prompt);
        try {
            const llmOutput = await this.completePrompt(rankingPrompt);
            const parsed = parseMajorityVotingOutput(llmOutput, responses);
            return parsed ?? buildFallbackRankings(responses);
        }
        catch {
            return buildFallbackRankings(responses);
        }
    }
    async generateConsensus(responses, topN, prompt) {
        if (responses.length < MIN_RESPONSES_FOR_MAJORITY) {
            throw new Error('At least 2 responses are required for majority voting');
        }
        const rankings = await this.rankResponses(responses, prompt);
        const effectiveTopN = topN > 0
            ? Math.min(topN, rankings.length)
            : rankings.length;
        const topModelIds = new Set(rankings.slice(0, effectiveTopN).map((item) => item.modelId));
        const selectedResponses = responses.filter((response) => topModelIds.has(response.modelId));
        const rankedResponseText = selectedResponses
            .map((response) => {
            const result = rankings.find((item) => item.modelId === response.modelId);
            const score = result?.eloScore ?? 0;
            return `Model: ${response.modelName}\nModel ID: ${response.modelId}\nAlignment Score: ${score}\nResponse:\n${response.content}`;
        })
            .join('\n\n---\n\n');
        const majorityModel = rankings[0]?.modelId ?? selectedResponses[0]?.modelId;
        const synthesisPrompt = buildMajoritySynthesisPrompt({
            prompt,
            rankedResponseText,
            majorityModel,
        });
        try {
            return await this.completePrompt(synthesisPrompt);
        }
        catch {
            return 'Failed to generate summary.';
        }
    }
    completePrompt(prompt) {
        return new Promise((resolve, reject) => {
            this.summarizerProvider.streamResponse(prompt, this.summarizerModelId, () => { void 0; }, (finalText) => resolve(finalText), (err) => reject(err));
        });
    }
}
