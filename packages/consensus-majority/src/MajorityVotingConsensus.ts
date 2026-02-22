import type {
    AIProvider,
    ConsensusModelResponse,
    ConsensusStrategy,
    RankingResult,
} from '@ensemble-ai/consensus-core';
import {
    buildFallbackRankings,
    buildMajorityRankingPrompt,
    buildMajoritySynthesisPrompt,
    parseMajorityVotingOutput,
} from './majorityVotingUtils';

const MIN_RESPONSES_FOR_MAJORITY = 2;

function writeDebug(message: string): void {
    const stderr = (globalThis as {
        process?: { stderr?: { write?: (chunk: string) => void } };
    }).process?.stderr;
    if (typeof stderr?.write === 'function') {
        stderr.write(message);
    }
}

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

        const rankStart = Date.now();
        writeDebug(`    [majority] rankResponses start: ${responses.length} responses\n`);
        const rankingPrompt = buildMajorityRankingPrompt(responses, prompt);

        try {
            const llmOutput = await this.completePrompt(rankingPrompt);
            writeDebug(`    [majority] rankResponses done in ${((Date.now() - rankStart) / 1000).toFixed(1)}s\n`);
            const parsed = parseMajorityVotingOutput(llmOutput, responses);
            return parsed ?? buildFallbackRankings(responses);
        } catch (err) {
            writeDebug(`    [majority] rankResponses error in ${((Date.now() - rankStart) / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}\n`);
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

        const synStart = Date.now();
        writeDebug(`    [majority] synthesis start\n`);
        try {
            const result = await this.completePrompt(synthesisPrompt);
            writeDebug(`    [majority] synthesis done in ${((Date.now() - synStart) / 1000).toFixed(1)}s\n`);
            return result;
        } catch (err) {
            writeDebug(`    [majority] synthesis error in ${((Date.now() - synStart) / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}\n`);
            return 'Failed to generate summary.';
        }
    }

    private completePrompt(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.summarizerProvider.streamResponse(
                prompt,
                this.summarizerModelId,
                () => { void 0; },
                (finalText: string) => resolve(finalText),
                (err: Error) => reject(err)
            );
        });
    }
}
