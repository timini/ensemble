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
import {
    ANSWER_EXTRACTION_SCHEMA,
    buildAnswerExtractionPrompt,
    parseAnswerExtraction,
    tallyVotes,
    winningAnswerText,
    type MajorityVoteResult,
} from './mechanicalVote';

const MIN_RESPONSES_FOR_MAJORITY = 2;

function writeDebug(message: string): void {
    const stderr = (globalThis as {
        process?: { stderr?: { write?: (chunk: string) => void } };
    }).process?.stderr;
    if (typeof stderr?.write === 'function') {
        stderr.write(message);
    }
}

/** How the consensus text was produced. */
export type MajorityConsensusMethod = 'vote' | 'llm';

/** Why the strategy used the LLM method instead of the vote. */
export type MajorityFallbackReason = 'extraction-failed' | 'long-form' | 'tie';

export interface MajorityConsensusOutcome {
    text: string;
    method: MajorityConsensusMethod;
    fallbackReason?: MajorityFallbackReason;
    /** The vote count, or null when the answers could not be extracted. */
    vote: MajorityVoteResult | null;
}

/**
 * Majority consensus.
 *
 * First a mechanical vote: one structured call to the summarizer extracts a
 * short final answer (number, option letter, yes/no or short phrase) from
 * every response; the answers are normalised and counted. When one answer
 * has the most votes, that answer is the consensus and no other call is made.
 *
 * On a tie, when most answers are long-form, or when extraction fails, it
 * falls back to the LLM method: one call ranks the responses by alignment
 * with the majority position and one call synthesises the top ones.
 */
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
        return (await this.runConsensus(responses, topN, prompt)).text;
    }

    /** Run the vote, falling back to the LLM method, and report how it went. */
    async runConsensus(
        responses: ConsensusModelResponse[],
        topN: number,
        prompt: string
    ): Promise<MajorityConsensusOutcome> {
        if (responses.length < MIN_RESPONSES_FOR_MAJORITY) {
            throw new Error('At least 2 responses are required for majority voting');
        }

        const vote = await this.mechanicalVote(responses, prompt);
        if (vote?.status === 'winner' && vote.winner) {
            return { text: winningAnswerText(vote.winner), method: 'vote', vote };
        }

        const fallbackReason: MajorityFallbackReason = !vote
            ? 'extraction-failed'
            : vote.status === 'tie' ? 'tie' : 'long-form';
        const text = await this.generateLlmConsensus(responses, topN, prompt);
        return { text, method: 'llm', fallbackReason, vote };
    }

    /** One structured call extracts every final answer; null when it fails. */
    private async mechanicalVote(
        responses: ConsensusModelResponse[],
        prompt: string
    ): Promise<MajorityVoteResult | null> {
        if (typeof this.summarizerProvider.generateStructured !== 'function') {
            return null;
        }
        const start = Date.now();
        try {
            const result = await this.summarizerProvider.generateStructured<unknown>(
                buildAnswerExtractionPrompt(responses, prompt),
                this.summarizerModelId,
                ANSWER_EXTRACTION_SCHEMA
            );
            const ballots = parseAnswerExtraction(result.parsed, responses);
            writeDebug(`    [majority] extraction done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
            return ballots ? tallyVotes(ballots) : null;
        } catch (err) {
            writeDebug(`    [majority] extraction error: ${err instanceof Error ? err.message : String(err)}\n`);
            return null;
        }
    }

    /** The LLM method: rank by alignment with the majority, then synthesise. */
    private async generateLlmConsensus(
        responses: ConsensusModelResponse[],
        topN: number,
        prompt: string
    ): Promise<string> {
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
