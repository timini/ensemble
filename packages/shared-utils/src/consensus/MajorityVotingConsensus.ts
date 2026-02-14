import type { AIProvider } from '../providers/types';
import type {
    ConsensusModelResponse,
    ConsensusStrategy,
    RankingResult,
} from './types';

interface MajorityVotingOutput {
    rankings?: {
        modelId?: string;
        alignmentScore?: number;
    }[];
}

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

        const rankingPrompt = this.buildRankingPrompt(responses, prompt);

        try {
            const llmOutput = await this.completePrompt(rankingPrompt);
            const parsed = this.parseMajorityVotingOutput(llmOutput, responses);
            return parsed ?? this.buildFallbackRankings(responses);
        } catch {
            return this.buildFallbackRankings(responses);
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

        const synthesisPrompt = `
You are a helpful assistant tasked with creating a final consensus answer from multiple model outputs.
Original Question: ${prompt}

Majority Signal:
- Treat the model with ID "${majorityModel}" as the majority anchor.
- Prefer details repeated across multiple responses.
- De-prioritize claims that appear in only one response unless they are clearly more correct or complete.

Ranked model responses:
${rankedResponseText}

Return a SINGLE final answer that directly addresses the original question.
Do not mention model names, ranking, or voting. Write only the final answer text.
        `.trim();

        try {
            return await this.completePrompt(synthesisPrompt);
        } catch {
            return 'Failed to generate summary.';
        }
    }

    private buildRankingPrompt(
        responses: ConsensusModelResponse[],
        originalPrompt: string
    ): string {
        const responseText = responses
            .map(
                (response) =>
                    `Model ID: ${response.modelId}\nModel Name: ${response.modelName}\nResponse:\n${response.content}`
            )
            .join('\n\n---\n\n');

        return `
You are evaluating multiple AI responses for majority alignment.
Original Question: ${originalPrompt}

Responses:
${responseText}

Task:
1) Identify which response best represents the majority position.
2) Rank all responses by alignment with that majority position.
3) Output ONLY valid JSON in this shape:
{
  "rankings": [
    { "modelId": "exact-model-id", "alignmentScore": 0-100 }
  ]
}

Rules:
- Include every model exactly once.
- Higher alignmentScore means stronger alignment with majority position.
- No prose, no markdown, JSON only.
        `.trim();
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

    private parseMajorityVotingOutput(
        output: string,
        responses: ConsensusModelResponse[]
    ): RankingResult[] | null {
        const parsed = this.tryParseJson(output);
        if (!parsed) {
            return null;
        }

        const responseIds = new Set(responses.map((response) => response.modelId));
        const rankings: RankingResult[] = [];
        const seenIds = new Set<string>();

        for (const item of parsed.rankings ?? []) {
            if (!item?.modelId || !responseIds.has(item.modelId) || seenIds.has(item.modelId)) {
                continue;
            }

            const score = typeof item.alignmentScore === 'number'
                ? Math.max(0, Math.min(100, item.alignmentScore))
                : 0;

            rankings.push({
                modelId: item.modelId,
                eloScore: score,
                rank: 0,
            });

            seenIds.add(item.modelId);
        }

        if (rankings.length === 0) {
            return null;
        }

        for (const response of responses) {
            if (!seenIds.has(response.modelId)) {
                rankings.push({
                    modelId: response.modelId,
                    eloScore: 0,
                    rank: 0,
                });
            }
        }

        rankings.sort((a, b) => b.eloScore - a.eloScore);
        rankings.forEach((item, index) => {
            item.rank = index + 1;
        });

        return rankings;
    }

    private tryParseJson(output: string): MajorityVotingOutput | null {
        try {
            return JSON.parse(output) as MajorityVotingOutput;
        } catch {
            const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (!fencedMatch?.[1]) {
                return null;
            }

            try {
                return JSON.parse(fencedMatch[1]) as MajorityVotingOutput;
            } catch {
                return null;
            }
        }
    }

    private buildFallbackRankings(responses: ConsensusModelResponse[]): RankingResult[] {
        return responses.map((response, index) => ({
            modelId: response.modelId,
            eloScore: 0,
            rank: index + 1,
        }));
    }
}
