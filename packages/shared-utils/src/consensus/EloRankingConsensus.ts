
import type { AIProvider } from '../providers/types';
import type { ConsensusModelResponse, ConsensusStrategy, RankingResult } from './types';

export class EloRankingConsensus implements ConsensusStrategy {
    private static readonly K_FACTOR = 32;
    private static readonly INITIAL_ELO = 1200;

    constructor(
        private judgeProvider: AIProvider,
        private judgeModelId: string,
        private summarizerProvider: AIProvider,
        private summarizerModelId: string
    ) { }

    /**
     * Ranks responses using an ELO rating system based on pairwise comparisons judged by an LLM.
     * Requires at least 3 responses.
     */
    async rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]> {
        if (responses.length < 3) {
            throw new Error('At least 3 responses are required for ELO ranking');
        }

        // Initialize ELO scores
        const eloScores = new Map<string, number>();
        responses.forEach(r => eloScores.set(r.modelId, EloRankingConsensus.INITIAL_ELO));

        // Generate Pairings (All-vs-All for accuracy, or random subset for speed?)
        // For < 10 responses, All-vs-All is feasible. 3 models = 3 pairs. 5 models = 10 pairs.
        const pairings = this.generatePairings(responses);

        // Run comparisons
        for (const pair of pairings) {
            const winnerId = await this.judgePair(pair[0], pair[1], prompt);

            if (winnerId) {
                this.updateElo(eloScores, pair[0].modelId, pair[1].modelId, winnerId);
            }
        }

        // Convert to result
        const results: RankingResult[] = Array.from(eloScores.entries()).map(([modelId, score]) => ({
            modelId,
            eloScore: score,
            rank: 0, // Assigned after sorting
        }));

        // Sort descending
        results.sort((a, b) => b.eloScore - a.eloScore);

        // Assign rank
        results.forEach((r, index) => {
            r.rank = index + 1;
        });

        return results;
    }

    async generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string> {
        if (responses.length < 3) {
            throw new Error('At least 3 responses are required for ELO ranking');
        }

        const rankings = await this.rankResponses(responses, prompt);

        // Take top N
        const topNRankings = rankings.slice(0, topN);
        const topNModelIds = new Set(topNRankings.map(r => r.modelId));

        const topResponses = responses.filter(r => topNModelIds.has(r.modelId));

        return this.summarizeResponses(topResponses, prompt);
    }

    private async summarizeResponses(responses: ConsensusModelResponse[], originalPrompt: string): Promise<string> {
        const responsesText = responses.map(r => `Model: ${r.modelName}\nResponse:\n${r.content}`).join('\n\n---\n\n');

        const prompt = `
You are a helpful assistant tasked with synthesizing multiple AI responses into a single, enhanced answer.
Original Question: ${originalPrompt}

Here are the responses from the top-ranked AI models:

${responsesText}

Your task is to produce a SINGLE, UNIFIED response that directly answers the original question. 
Do NOT compare or analyze the responses. Do NOT mention "models agree/disagree" or reference the individual responses.
Instead, synthesize the best elements from all responses into one coherent, comprehensive answer that a user would receive as the final response to their question.
Write as if you are directly answering the original question yourself, enhanced by the collective intelligence of the ensemble.
        `.trim();

        return new Promise((resolve) => {
             
            this.summarizerProvider.streamResponse(prompt, this.summarizerModelId,
                () => { void 0; },
                (finalText: string) => resolve(finalText),
                (err: Error) => {
                    console.error('Summarizer error:', err);
                    resolve('Failed to generate summary.');
                }
            );
        });
    }

    private generatePairings(responses: ConsensusModelResponse[]): [ConsensusModelResponse, ConsensusModelResponse][] {
        const pairs: [ConsensusModelResponse, ConsensusModelResponse][] = [];
        for (let i = 0; i < responses.length; i++) {
            for (let j = i + 1; j < responses.length; j++) {
                pairs.push([responses[i]!, responses[j]!]);
            }
        }
        return pairs;
    }

    private async judgePair(modelA: ConsensusModelResponse, modelB: ConsensusModelResponse, originalPrompt: string): Promise<string | null> {
        const prompt = `
You are an impartial judge evaluating two AI responses.
Question: ${originalPrompt}

Response A (from ${modelA.modelName}):
${modelA.content}

Response B (from ${modelB.modelName}):
${modelB.content}

Which response is better? Reply EXACTLY with "Winner: ${modelA.modelName}" or "Winner: ${modelB.modelName}". If it is a tie, reply "Winner: Tie".
        `.trim();

        return new Promise((resolve) => {
             
            this.judgeProvider.streamResponse(prompt, this.judgeModelId,
                () => { void 0; },
                (finalText: string) => {
                    if (finalText.includes(`Winner: ${modelA.modelName}`)) {
                        resolve(modelA.modelId);
                    } else if (finalText.includes(`Winner: ${modelB.modelName}`)) {
                        resolve(modelB.modelId);
                    } else {
                        resolve(null); // Tie or unclear
                    }
                },
                (err: Error) => {
                    console.error('Judge error:', err);
                    resolve(null);
                }
            );
        });
    }

    private updateElo(scores: Map<string, number>, playerAId: string, playerBId: string, winnerId: string) {
        const ratingA = scores.get(playerAId)!;
        const ratingB = scores.get(playerBId)!;

        const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        const expectedScoreB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

        const actualScoreA = winnerId === playerAId ? 1 : 0;
        const actualScoreB = winnerId === playerBId ? 1 : 0;

        // If tie (winnerId is null/neither), expected logic could differ, but here we only call update if there is a winner.
        // If we want to handle ties, we need '0.5'.

        const newRatingA = ratingA + EloRankingConsensus.K_FACTOR * (actualScoreA - expectedScoreA);
        const newRatingB = ratingB + EloRankingConsensus.K_FACTOR * (actualScoreB - expectedScoreB);

        scores.set(playerAId, newRatingA);
        scores.set(playerBId, newRatingB);
    }
}
