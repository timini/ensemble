const DEFAULT_TOP_K = 3;
export class EloRankingConsensus {
    judgeProvider;
    judgeModelId;
    summarizerProvider;
    summarizerModelId;
    static K_FACTOR = 32;
    static INITIAL_ELO = 1200;
    constructor(judgeProvider, judgeModelId, summarizerProvider, summarizerModelId) {
        this.judgeProvider = judgeProvider;
        this.judgeModelId = judgeModelId;
        this.summarizerProvider = summarizerProvider;
        this.summarizerModelId = summarizerModelId;
    }
    /**
     * Ranks responses using an ELO rating system based on pairwise comparisons judged by an LLM.
     * Requires at least 3 responses.
     */
    async rankResponses(responses, prompt) {
        if (responses.length < 3) {
            throw new Error('At least 3 responses are required for ELO ranking');
        }
        // Initialize ELO scores
        const eloScores = new Map();
        responses.forEach(r => eloScores.set(r.modelId, EloRankingConsensus.INITIAL_ELO));
        // Generate Pairings (All-vs-All for accuracy)
        // For < 10 responses this is feasible. 3 models = 3 pairs. 5 models = 10 pairs.
        const pairings = this.generatePairings(responses);
        // Run all pairwise comparisons in parallel
        const judgments = await Promise.all(pairings.map(async (pair) => ({
            pair,
            winnerId: await this.judgePair(pair[0], pair[1], prompt),
        })));
        // Apply ELO updates in original pairing order
        for (const { pair, winnerId } of judgments) {
            if (winnerId) {
                this.updateElo(eloScores, pair[0].modelId, pair[1].modelId, winnerId);
            }
        }
        // Convert to result
        const results = Array.from(eloScores.entries()).map(([modelId, score]) => ({
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
    async generateConsensus(responses, topN, prompt) {
        if (responses.length < 3) {
            throw new Error('At least 3 responses are required for ELO ranking');
        }
        const rankings = await this.rankResponses(responses, prompt);
        // Take top N
        const requestedTopN = topN > 0 ? topN : DEFAULT_TOP_K;
        const effectiveTopN = Math.max(1, Math.min(requestedTopN, rankings.length));
        const topNRankings = rankings.slice(0, effectiveTopN);
        const topNModelIds = new Set(topNRankings.map(r => r.modelId));
        const topResponses = responses.filter(r => topNModelIds.has(r.modelId));
        return this.summarizeResponses(topResponses, prompt);
    }
    async summarizeResponses(responses, originalPrompt) {
        const responsesText = responses.map((response, index) => `Candidate ${index + 1}\nResponse:\n${response.content}`).join('\n\n---\n\n');
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
            this.summarizerProvider.streamResponse(prompt, this.summarizerModelId, () => { void 0; }, (finalText) => resolve(finalText), (err) => {
                console.error('Summarizer error:', err);
                resolve('Failed to generate summary.');
            });
        });
    }
    generatePairings(responses) {
        const pairs = [];
        for (let i = 0; i < responses.length; i++) {
            for (let j = i + 1; j < responses.length; j++) {
                pairs.push([responses[i], responses[j]]);
            }
        }
        return pairs;
    }
    async judgePair(modelA, modelB, originalPrompt) {
        const prompt = `
You are an impartial evaluator selecting the more correct answer.

Original Question:
${originalPrompt}

Model A:
${modelA.content}

Model B:
${modelB.content}

Decision rules:
- Choose the answer that is more factually correct and better follows the question constraints.
- If both are equally valid, select TIE.
- Ignore style, verbosity, and confidence wording.

Output exactly one of:
- WINNER: A
- WINNER: B
- WINNER: TIE
        `.trim();
        return new Promise((resolve) => {
            this.judgeProvider.streamResponse(prompt, this.judgeModelId, () => { void 0; }, (finalText) => {
                const normalized = finalText.toUpperCase();
                if (normalized.includes('WINNER: A')) {
                    resolve(modelA.modelId);
                }
                else if (normalized.includes('WINNER: B')) {
                    resolve(modelB.modelId);
                }
                else {
                    resolve(null); // Tie or unclear
                }
            }, (err) => {
                console.error('Judge error:', err);
                resolve(null);
            });
        });
    }
    updateElo(scores, playerAId, playerBId, winnerId) {
        const ratingA = scores.get(playerAId);
        const ratingB = scores.get(playerBId);
        const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        const expectedScoreB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
        const actualScoreA = winnerId === playerAId ? 1 : winnerId === playerBId ? 0 : 0.5;
        const actualScoreB = winnerId === playerBId ? 1 : winnerId === playerAId ? 0 : 0.5;
        const newRatingA = ratingA + EloRankingConsensus.K_FACTOR * (actualScoreA - expectedScoreA);
        const newRatingB = ratingB + EloRankingConsensus.K_FACTOR * (actualScoreB - expectedScoreB);
        scores.set(playerAId, newRatingA);
        scores.set(playerBId, newRatingB);
    }
}
