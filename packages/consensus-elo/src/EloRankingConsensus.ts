/**
 * @module consensus-elo/EloRankingConsensus
 *
 * ELO-based consensus strategy that ranks LLM responses using pairwise
 * comparisons judged by an LLM, then synthesizes the top-ranked responses.
 *
 * Key features:
 * - **Position-swap debiasing**: Each pair is judged twice (forward + reversed)
 *   to detect and mitigate position bias in the judge LLM.
 * - **Confidence-weighted K-factor**: Consistent judgments (HIGH confidence)
 *   produce full ELO updates; inconsistent ones (LOW) get half weight.
 * - **Chain-of-thought judging**: The judge prompt requests brief reasoning
 *   before the verdict, improving judgment accuracy.
 * - **Proper tie handling**: Ties correctly produce 0.5/0.5 ELO updates
 *   (pushing unequal ratings toward each other). Only double-errors are skipped.
 */

import type { AIProvider, ConsensusModelResponse, ConsensusStrategy, RankingResult } from '@ensemble-ai/consensus-core';
import { INITIAL_ELO, updateElo } from './eloScoring';
import { judgePairWithSwap } from './eloJudge';

const DEFAULT_TOP_K = 3;

export class EloRankingConsensus implements ConsensusStrategy {
    constructor(
        private judgeProvider: AIProvider,
        private judgeModelId: string,
        private summarizerProvider: AIProvider,
        private summarizerModelId: string
    ) { }

    /**
     * Ranks responses using an ELO rating system with position-swap debiased
     * pairwise comparisons. Requires at least 3 responses.
     *
     * Each pair of responses is judged twice (forward and reversed position)
     * in parallel. Consistent judgments receive full K-factor weight;
     * inconsistent ones receive half. Double-errors are skipped entirely.
     */
    async rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]> {
        if (responses.length < 3) {
            throw new Error('At least 3 responses are required for ELO ranking');
        }

        const rankStart = Date.now();

        // Initialize ELO scores
        const eloScores = new Map<string, number>();
        responses.forEach(r => eloScores.set(r.modelId, INITIAL_ELO));

        // Generate all-vs-all pairings (3 models = 3 pairs, 5 models = 10 pairs)
        const pairings = this.generatePairings(responses);
        process.stderr.write(`    [elo-rank] start: ${responses.length} responses, ${pairings.length} pairs (${pairings.length * 2} judge calls)\n`);

        // Run all pairwise comparisons in parallel
        // Each pair internally runs 2 judge calls (forward + reversed)
        const judgments = await Promise.all(
            pairings.map(async (pair) => ({
                pair,
                judgment: await judgePairWithSwap(
                    this.judgeProvider, this.judgeModelId,
                    pair[0], pair[1], prompt,
                ),
            })),
        );

        process.stderr.write(`    [elo-rank] judgments done in ${((Date.now() - rankStart) / 1000).toFixed(1)}s\n`);

        // Apply ELO updates — skip only double-errors (confidence === undefined)
        for (const { pair, judgment } of judgments) {
            if (judgment.confidence !== undefined) {
                updateElo(eloScores, pair[0].modelId, pair[1].modelId, judgment.winnerId, judgment.confidence);
            }
        }

        // Convert to sorted result array
        const results: RankingResult[] = Array.from(eloScores.entries()).map(([modelId, score]) => ({
            modelId,
            eloScore: score,
            rank: 0,
        }));

        results.sort((a, b) => b.eloScore - a.eloScore);
        results.forEach((r, index) => { r.rank = index + 1; });

        return results;
    }

    async generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string> {
        if (responses.length < 3) {
            throw new Error('At least 3 responses are required for ELO ranking');
        }

        const rankings = await this.rankResponses(responses, prompt);

        const requestedTopN = topN > 0 ? topN : DEFAULT_TOP_K;
        const effectiveTopN = Math.max(1, Math.min(requestedTopN, rankings.length));
        const topNRankings = rankings.slice(0, effectiveTopN);
        const topNModelIds = new Set(topNRankings.map(r => r.modelId));

        const topResponses = responses.filter(r => topNModelIds.has(r.modelId));

        return this.summarizeResponses(topResponses, prompt);
    }

    private async summarizeResponses(responses: ConsensusModelResponse[], originalPrompt: string): Promise<string> {
        const sumStart = Date.now();
        process.stderr.write(`    [elo-summarize] start: ${responses.length} top responses\n`);
        const responsesText = responses.map((response, index) =>
            `Candidate ${index + 1}\nResponse:\n${response.content}`
        ).join('\n\n---\n\n');

        const prompt = `
You are a consensus resolver. Produce the most accurate final answer to the original question.

Original Question:
${originalPrompt}

Top-Ranked Candidate Responses:
${responsesText}

Instructions:
1) Extract each candidate's final answer and key supporting facts.
2) Resolve disagreements by choosing the most defensible answer, prioritizing factual correctness over style.
3) Prefer stronger reasoning over popularity when they conflict.
4) Keep only information needed to answer the original question.
5) Preserve required output constraints from the original question exactly.

Output rules:
- Return ONLY the final user answer text.
- No markdown formatting (no bold, italics, code fences, headings).
- No references to models, ranking, or voting.
- If the question asks for a constrained format (single letter, number, JSON, etc.), output exactly that format and nothing else.
        `.trim();

        return new Promise((resolve) => {
            this.summarizerProvider.streamResponse(prompt, this.summarizerModelId,
                () => { void 0; },
                (finalText: string) => {
                    process.stderr.write(`    [elo-summarize] done in ${((Date.now() - sumStart) / 1000).toFixed(1)}s\n`);
                    resolve(finalText);
                },
                (err: Error) => {
                    process.stderr.write(`    [elo-summarize] error in ${((Date.now() - sumStart) / 1000).toFixed(1)}s: ${err.message}\n`);
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
}
