
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

    it('should rank responses based on judge comparison', async () => {
        // Mock the judge to always prefer the first model in the prompt for simplicity,
        // or setup specific scenarios.
        // For this test, let's assume we want Model A > Model B > Model C.

        // We can inspect the prompt to decide who wins.
        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            // Determine winner based on which models are being compared
            // Model A always wins, Model B beats Model C
            let winner = 'TIE';

            const hasModelA = prompt.includes('Model A');
            const hasModelB = prompt.includes('Model B');
            const hasModelC = prompt.includes('Model C');

            if (hasModelA && hasModelB) winner = 'Model A';
            else if (hasModelA && hasModelC) winner = 'Model A';
            else if (hasModelB && hasModelC) winner = 'Model B';

            onComplete(`Winner: ${winner}`, 100, 10);
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt containing Model A vs Model B');

        expect(ranking).toHaveLength(3);
        // Verify all models are ranked
        const modelIds = ranking.map(r => r.modelId);
        expect(modelIds).toContain('model-a');
        expect(modelIds).toContain('model-b');
        expect(modelIds).toContain('model-c');

        // Model A should be rank 1 (highest ELO - most wins)
        expect(ranking[0].modelId).toBe('model-a');
        // Check that rankings are in descending order by score
        expect(ranking[0].eloScore).toBeGreaterThanOrEqual(ranking[1].eloScore);
        expect(ranking[1].eloScore).toBeGreaterThanOrEqual(ranking[2].eloScore);
    });

    it('should generate consensus summary from top N responses', async () => {
        // Mock rank responses to control order
        vi.spyOn(strategy, 'rankResponses').mockResolvedValue([
            { modelId: 'model-a', eloScore: 1232, rank: 1 },
            { modelId: 'model-b', eloScore: 1200, rank: 2 },
            { modelId: 'model-c', eloScore: 1168, rank: 3 },
        ]);

        (mockJudgeProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            // Mock summarizer behavior
            onComplete('Consensus Summary', 100, 10);
            return Promise.resolve();
        });

        const summary = await strategy.generateConsensus(mockResponses, 2, 'Original Prompt');

        expect(summary).toBe('Consensus Summary');
        expect(strategy.rankResponses).toHaveBeenCalledWith(mockResponses, 'Original Prompt');

        // Verify streamResponse was called with a prompt containing only Model A and Model B content
        // This is a bit tricky since we reused the mock provider for both judge and summarizer above
        // but passing the same mock object.
        // We can check the last call or inspect calls.

        const calls = (mockJudgeProvider.streamResponse as Mock).mock.calls;
        const summarizerCall = calls[calls.length - 1];
        const promptArg = summarizerCall[0];

        expect(promptArg).toContain('Model A');
        expect(promptArg).toContain('Model B');
        expect(promptArg).not.toContain('Model C');
    });
});
