
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { EloRankingConsensus } from '../EloRankingConsensus';
import type { ConsensusModelResponse } from '../types';
import type { AIProvider } from '../../../providers/types';

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

    it('should rank responses based on judge comparison using model IDs', async () => {
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            // Judge prompt now uses model IDs, not model names
            const hasModelA = prompt.includes('model-a');
            const hasModelB = prompt.includes('model-b');
            const hasModelC = prompt.includes('model-c');

            let winner = 'TIE';

            if (hasModelA && hasModelB) winner = 'model-a';
            else if (hasModelA && hasModelC) winner = 'model-a';
            else if (hasModelB && hasModelC) winner = 'model-b';

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

    it('should handle ties by awarding 0.5 score to both models', async () => {
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
        // give 0.5 actual score vs ~0.5 expected score
        for (const result of ranking) {
            expect(result.eloScore).toBeCloseTo(1200, 0);
        }
    });

    it('should use improved judge prompt with decision rules', async () => {
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

        await strategy.rankResponses(mockResponses, 'Test Prompt');

        // 3 models = 3 pairwise comparisons
        expect(capturedPrompts).toHaveLength(3);

        const firstPrompt = capturedPrompts[0];
        // Verify the improved judge prompt structure
        expect(firstPrompt).toContain('impartial evaluator');
        expect(firstPrompt).toContain('Decision rules:');
        expect(firstPrompt).toContain('factually correct');
        expect(firstPrompt).toContain('Output exactly one of:');
        expect(firstPrompt).toContain('WINNER:');
        // Should use model IDs, not model names, to avoid bias
        expect(firstPrompt).toContain('Model ID: model-a');
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
        expect(promptArg).toContain('Model A');
        expect(promptArg).toContain('Model B');
        expect(promptArg).not.toContain('Model C');
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

        // With default top-k of 3 and 3 models, all should be included
        expect(promptArg).toContain('Model A');
        expect(promptArg).toContain('Model B');
        expect(promptArg).toContain('Model C');
    });
});
