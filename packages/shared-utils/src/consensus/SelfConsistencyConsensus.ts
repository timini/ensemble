import type { ConsensusModelResponse, ConsensusStrategy, RankingResult } from './types';

/**
 * Self-consistency consensus strategy: extracts a short answer from each
 * ensemble response and picks the plurality winner. Requires zero extra
 * LLM calls — useful as a cheap baseline to measure whether simple voting
 * beats LLM-mediated synthesis for constrained-answer questions (MCQ, numeric).
 */
export class SelfConsistencyConsensus implements ConsensusStrategy {
    constructor(
        private extractAnswer: (content: string) => string | null
    ) {}

    async rankResponses(responses: ConsensusModelResponse[], _prompt: string): Promise<RankingResult[]> {
        const answerCounts = this.countAnswers(responses);
        const sorted = [...answerCounts.entries()].sort((a, b) => b[1] - a[1]);

        return responses.map((r) => {
            const answer = this.extractAnswer(r.content);
            const count = answer ? (answerCounts.get(answer) ?? 0) : 0;
            const rank = answer ? (sorted.findIndex(([a]) => a === answer) + 1) : sorted.length + 1;
            return { modelId: r.modelId, eloScore: count, rank };
        });
    }

    async generateConsensus(responses: ConsensusModelResponse[], _topN: number, _prompt: string): Promise<string> {
        const answerCounts = this.countAnswers(responses);

        let bestAnswer: string | null = null;
        let bestCount = 0;
        for (const [answer, count] of answerCounts.entries()) {
            if (count > bestCount) {
                bestAnswer = answer;
                bestCount = count;
            }
        }

        return bestAnswer ?? responses[0]?.content ?? '';
    }

    private countAnswers(responses: ConsensusModelResponse[]): Map<string, number> {
        const counts = new Map<string, number>();
        for (const r of responses) {
            const answer = this.extractAnswer(r.content);
            if (answer) {
                counts.set(answer, (counts.get(answer) ?? 0) + 1);
            }
        }
        return counts;
    }
}
