import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { MajorityVotingConsensus } from '../MajorityVotingConsensus';
import type { AIProvider } from '../../../providers/types';
import type { ConsensusModelResponse } from '../types';

describe('MajorityVotingConsensus', () => {
    let mockSummarizerProvider: AIProvider;
    let strategy: MajorityVotingConsensus;

    const mockResponses: ConsensusModelResponse[] = [
        { modelId: 'model-a', modelName: 'Model A', content: 'Response A content' },
        { modelId: 'model-b', modelName: 'Model B', content: 'Response B content' },
        { modelId: 'model-c', modelName: 'Model C', content: 'Response C content' },
    ];

    beforeEach(() => {
        mockSummarizerProvider = {
            streamResponse: vi.fn(),
            generateEmbeddings: vi.fn(),
            validateApiKey: vi.fn(),
            listAvailableModels: vi.fn(),
            listAvailableTextModels: vi.fn(),
        } as unknown as AIProvider;

        strategy = new MajorityVotingConsensus(
            mockSummarizerProvider,
            'summarizer-model-id'
        );
    });

    it('should throw error if fewer than 2 responses are provided', async () => {
        const minimalResponses = mockResponses.slice(0, 1);
        await expect(
            strategy.rankResponses(minimalResponses, 'Test Prompt')
        ).rejects.toThrow('At least 2 responses are required for majority voting');
    });

    it('should rank responses based on majority alignment', async () => {
        (mockSummarizerProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete(JSON.stringify({
                rankings: [
                    { modelId: 'model-b', alignmentScore: 95 },
                    { modelId: 'model-a', alignmentScore: 88 },
                    { modelId: 'model-c', alignmentScore: 74 },
                ],
            }), 100, 10);
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt');

        expect(ranking).toHaveLength(3);
        expect(ranking[0]).toMatchObject({ modelId: 'model-b', rank: 1, eloScore: 95 });
        expect(ranking[1]).toMatchObject({ modelId: 'model-a', rank: 2, eloScore: 88 });
        expect(ranking[2]).toMatchObject({ modelId: 'model-c', rank: 3, eloScore: 74 });
    });

    it('should generate consensus using top N ranked responses', async () => {
        vi.spyOn(strategy, 'rankResponses').mockResolvedValue([
            { modelId: 'model-b', eloScore: 96, rank: 1 },
            { modelId: 'model-a', eloScore: 90, rank: 2 },
            { modelId: 'model-c', eloScore: 65, rank: 3 },
        ]);

        (mockSummarizerProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('Majority Consensus Summary', 100, 10);
            return Promise.resolve();
        });

        const summary = await strategy.generateConsensus(mockResponses, 2, 'Original Prompt');

        expect(summary).toBe('Majority Consensus Summary');
        expect(strategy.rankResponses).toHaveBeenCalledWith(mockResponses, 'Original Prompt');

        const calls = (mockSummarizerProvider.streamResponse as Mock).mock.calls;
        const promptArg = calls[0][0];

        expect(promptArg).toContain('Model B');
        expect(promptArg).toContain('Model A');
        expect(promptArg).not.toContain('Model C');
    });

    it('should fall back to deterministic ranking when ranking JSON is invalid', async () => {
        (mockSummarizerProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('not valid json', 100, 10);
            return Promise.resolve();
        });

        const ranking = await strategy.rankResponses(mockResponses, 'Test Prompt');
        expect(ranking).toEqual([
            { modelId: 'model-a', eloScore: 0, rank: 1 },
            { modelId: 'model-b', eloScore: 0, rank: 2 },
            { modelId: 'model-c', eloScore: 0, rank: 3 },
        ]);
    });
});
