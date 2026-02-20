
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { EloRankingConsensus } from '../EloRankingConsensus';
import type { ConsensusModelResponse, AIProvider } from '@ensemble-ai/consensus-core';

describe('EloRankingConsensus', () => {
    let mockJudgeProvider: AIProvider;
    let strategy: EloRankingConsensus;

    const mockResponses: ConsensusModelResponse[] = [
        { modelId: 'model-a', modelName: 'Model A', content: 'Response A content' },
        { modelId: 'model-b', modelName: 'Model B', content: 'Response B content' },
        { modelId: 'model-c', modelName: 'Model C', content: 'Response C content' },
    ];

    beforeEach(() => {
        mockJudgeProvider = {
            streamResponse: vi.fn(),
            generateEmbeddings: vi.fn(),
            validateApiKey: vi.fn(),
            listAvailableModels: vi.fn(),
            listAvailableTextModels: vi.fn(),
        } as unknown as AIProvider;

        strategy = new EloRankingConsensus(mockJudgeProvider, 'judge-model-id', mockJudgeProvider, 'summarizer-model-id');
    });

    it('should throw error if fewer than 3 responses are provided', async () => {
        const minimalResponses = mockResponses.slice(0, 2);
        await expect(strategy.rankResponses(minimalResponses, 'Test Prompt')).rejects.toThrow('At least 3 responses are required for ELO ranking');
    });

    it('should make 2 judge calls per pair (position-swap debiasing)', async () => {
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('WINNER: TIE', 100, 10);
            return Promise.resolve();
        });

        await strategy.rankResponses(mockResponses, 'Test Prompt');

        // 3 models = 3 pairs, 2 judge calls per pair = 6 total judge calls
        expect(mockJudgeProvider.streamResponse).toHaveBeenCalledTimes(6);
    });

    it('should rank responses based on judge comparison', async () => {
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            // Judge prompt uses anonymous labels (Model A / Model B)
            // Determine winner by inspecting which response content is present
            const hasResponseA = prompt.includes('Response A content');
            const hasResponseB = prompt.includes('Response B content');
            const hasResponseC = prompt.includes('Response C content');

            // Model A always wins, Model B beats Model C
            // With position-swap, we need consistent winners regardless of order
            let winner = 'TIE';
            if (hasResponseA && hasResponseB) {
                // A should win — if A is in position "Model A:", pick A; if in "Model B:", pick B
                const aIsFirst = prompt.indexOf('Response A content') < prompt.indexOf('Response B content');
                winner = aIsFirst ? 'A' : 'B';
            } else if (hasResponseA && hasResponseC) {
                const aIsFirst = prompt.indexOf('Response A content') < prompt.indexOf('Response C content');
                winner = aIsFirst ? 'A' : 'B';
            } else if (hasResponseB && hasResponseC) {
                const bIsFirst = prompt.indexOf('Response B content') < prompt.indexOf('Response C content');
                winner = bIsFirst ? 'A' : 'B';
            }

            onComplete(`WINNER: ${winner}`, 100, 10);
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt');

        expect(ranking).toHaveLength(3);
        const modelIds = ranking.map(r => r.modelId);
        expect(modelIds).toContain('model-a');
        expect(modelIds).toContain('model-b');
        expect(modelIds).toContain('model-c');

        // Model A should be rank 1 (highest ELO - most wins)
        expect(ranking[0].modelId).toBe('model-a');
        expect(ranking[0].eloScore).toBeGreaterThanOrEqual(ranking[1].eloScore);
        expect(ranking[1].eloScore).toBeGreaterThanOrEqual(ranking[2].eloScore);
    });

    it('should handle ties by awarding 0.5 score to both models (bug fix)', async () => {
        // All matchups result in ties
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('WINNER: TIE', 100, 10);
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt');

        expect(ranking).toHaveLength(3);
        // All models should remain at the initial ELO (1200) since all ties
        // give 0.5 actual score vs ~0.5 expected score.
        // Previously ties were silently skipped due to `if (winnerId)` being falsy for null.
        for (const result of ranking) {
            expect(result.eloScore).toBeCloseTo(1200, 0);
        }
    });

    it('should detect and neutralize position-biased judge via position-swap', async () => {
        // A position-biased judge always picks "A" (the first position)
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            // Always pick position A regardless of content
            onComplete('WINNER: A', 100, 10);
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt');

        // With position-swap debiasing, a purely position-biased judge produces
        // contradictory outcomes (forward: A wins, reversed: also says A wins but
        // mapped back = B wins) which resolve to LOW-confidence TIEs.
        // All models should end up with near-equal ELO scores.
        const scores = ranking.map(r => r.eloScore);
        const maxDelta = Math.max(...scores) - Math.min(...scores);

        // With LOW-confidence ties (K=16), the deltas should be very small
        // compared to what an undebiased judge would produce
        expect(maxDelta).toBeLessThan(10);
    });

    it('should produce differentiated rankings for consistent vs inconsistent judgments', async () => {
        let callCount = 0;
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            callCount++;
            const hasResponseA = prompt.includes('Response A content');
            const hasResponseB = prompt.includes('Response B content');

            // For A vs B pair: always consistently pick A (regardless of position)
            if (hasResponseA && hasResponseB) {
                const aIsFirst = prompt.indexOf('Response A content') < prompt.indexOf('Response B content');
                onComplete(`WINNER: ${aIsFirst ? 'A' : 'B'}`, 100, 10);
            } else {
                // All other pairs: TIE
                onComplete('WINNER: TIE', 100, 10);
            }
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt');

        // A should be ranked above B (consistent HIGH-confidence win)
        const rankA = ranking.find(r => r.modelId === 'model-a')!;
        const rankB = ranking.find(r => r.modelId === 'model-b')!;
        expect(rankA.eloScore).toBeGreaterThan(rankB.eloScore);

        // HIGH confidence K=32 should produce a significant delta
        const delta = rankA.eloScore - rankB.eloScore;
        expect(delta).toBeGreaterThan(20);
    });

    it('should use anonymous labels in judge prompt to avoid bias', async () => {
        // Use distinct model names/IDs so we can verify they don't leak
        const namedResponses: ConsensusModelResponse[] = [
            { modelId: 'gpt-4o', modelName: 'GPT-4o', content: 'Alpha response' },
            { modelId: 'claude-3', modelName: 'Claude 3', content: 'Beta response' },
            { modelId: 'gemini-pro', modelName: 'Gemini Pro', content: 'Gamma response' },
        ];

        const capturedPrompts: string[] = [];
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            capturedPrompts.push(prompt);
            onComplete('WINNER: TIE', 100, 10);
            return Promise.resolve();
        });

        await strategy.rankResponses(namedResponses, 'Test Prompt');

        // 3 models = 3 pairs, 2 calls per pair = 6 judge prompts
        expect(capturedPrompts).toHaveLength(6);

        const firstPrompt = capturedPrompts[0];
        // Verify the judge prompt uses anonymous labels
        expect(firstPrompt).toContain('impartial evaluator');
        expect(firstPrompt).toContain('Decision rules:');
        expect(firstPrompt).toContain('Model A:');
        expect(firstPrompt).toContain('Model B:');
        expect(firstPrompt).toContain('WINNER: A');
        expect(firstPrompt).toContain('WINNER: B');
        // Verify chain-of-thought instruction is present
        expect(firstPrompt).toContain('briefly explain your reasoning');
        // Must NOT leak real model IDs or names to the judge
        expect(firstPrompt).not.toContain('gpt-4o');
        expect(firstPrompt).not.toContain('GPT-4o');
        expect(firstPrompt).not.toContain('claude-3');
        expect(firstPrompt).not.toContain('Claude 3');
        expect(firstPrompt).not.toContain('gemini-pro');
        expect(firstPrompt).not.toContain('Gemini Pro');
    });

    it('should generate consensus summary from top N responses', async () => {
        // Mock rank responses to control order
        vi.spyOn(strategy, 'rankResponses').mockResolvedValue([
            { modelId: 'model-a', eloScore: 1232, rank: 1 },
            { modelId: 'model-b', eloScore: 1200, rank: 2 },
            { modelId: 'model-c', eloScore: 1168, rank: 3 },
        ]);

        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('Consensus Summary', 100, 10);
            return Promise.resolve();
        });

        const summary = await strategy.generateConsensus(mockResponses, 2, 'Original Prompt');

        expect(summary).toBe('Consensus Summary');
        expect(strategy.rankResponses).toHaveBeenCalledWith(mockResponses, 'Original Prompt');

        const calls = (mockJudgeProvider.streamResponse as Mock).mock.calls;
        const summarizerCall = calls[calls.length - 1];
        const promptArg = summarizerCall[0];

        // Verify improved synthesis prompt structure
        expect(promptArg).toContain('consensus resolver');
        // Top 2 responses should be included as anonymous candidates
        expect(promptArg).toContain('Candidate 1');
        expect(promptArg).toContain('Candidate 2');
        // Model C was rank 3, should be excluded when topN=2
        expect(promptArg).not.toContain('Response C content');
        // Must not leak model identity into synthesis prompt
        expect(promptArg).not.toContain('model-a');
        expect(promptArg).not.toContain('model-b');
        expect(promptArg).toContain('Output rules');
        expect(promptArg).toContain('No markdown formatting');
    });

    it('should default topN to 3 when 0 is passed', async () => {
        vi.spyOn(strategy, 'rankResponses').mockResolvedValue([
            { modelId: 'model-a', eloScore: 1232, rank: 1 },
            { modelId: 'model-b', eloScore: 1200, rank: 2 },
            { modelId: 'model-c', eloScore: 1168, rank: 3 },
        ]);

        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('Summary', 100, 10);
            return Promise.resolve();
        });

        await strategy.generateConsensus(mockResponses, 0, 'Prompt');

        const calls = (mockJudgeProvider.streamResponse as Mock).mock.calls;
        const promptArg = calls[calls.length - 1][0];

        // With default top-k of 3 and 3 models, all should be included as anonymous candidates
        expect(promptArg).toContain('Candidate 1');
        expect(promptArg).toContain('Candidate 2');
        expect(promptArg).toContain('Candidate 3');
    });
});
